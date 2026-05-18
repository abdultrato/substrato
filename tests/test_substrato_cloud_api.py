from __future__ import annotations

from django.contrib.auth import get_user_model
import pytest

from apps.tenants.models.tenant import Tenant
from events.runtime_bridge import reset_runtime_bridge


@pytest.fixture(autouse=True)
def _reset_runtime_bridge_fixture():
    reset_runtime_bridge()
    yield
    reset_runtime_bridge()


def _admin_user():
    tenant = Tenant.objects.create(
        identifier="tn-cloud-api",
        name="Tenant Cloud API",
        domain="testserver",
        active=True,
    )
    user_model = get_user_model()
    return user_model.objects.create_superuser(
        username="cloud_api_admin",
        email="cloud-api-admin@example.com",
        password="testpass123",
        tenant=tenant,
    )


@pytest.mark.django_db
def test_cloud_control_api_returns_503_when_runtime_disabled(api_client, settings, tmp_path):
    settings.SUBSTRATO_OS_RUNTIME_ENABLED = False
    settings.SUBSTRATO_OS_OUTBOX_PATH = str(tmp_path / "cloud-api.sqlite3")

    admin = _admin_user()
    api_client.force_authenticate(user=admin)

    response = api_client.get("/api/v1/monitoring/cloud_control/", {"resource": "clusters"})

    assert response.status_code == 503
    assert "runtime desativado" in response.data["detail"].lower()


@pytest.mark.django_db
def test_cloud_control_api_cluster_deploy_reconcile_and_failover(api_client, settings, tmp_path):
    settings.SUBSTRATO_OS_RUNTIME_ENABLED = True
    settings.SUBSTRATO_OS_OUTBOX_PATH = str(tmp_path / "cloud-api.sqlite3")

    admin = _admin_user()
    api_client.force_authenticate(user=admin)

    register_a = api_client.post(
        "/api/v1/monitoring/cloud_control/",
        {
            "action": "register_cluster",
            "cluster_id": "cluster-a",
            "region": "maputo",
        },
        format="json",
    )
    register_b = api_client.post(
        "/api/v1/monitoring/cloud_control/",
        {
            "action": "register_cluster",
            "cluster_id": "cluster-b",
            "region": "beira",
        },
        format="json",
    )

    assert register_a.status_code == 201
    assert register_b.status_code == 201

    assign_a = api_client.post(
        "/api/v1/monitoring/cloud_control/",
        {
            "action": "assign_node",
            "cluster_id": "cluster-a",
            "node_id": "edge-a",
            "node_region": "maputo",
        },
        format="json",
    )
    assign_b = api_client.post(
        "/api/v1/monitoring/cloud_control/",
        {
            "action": "assign_node",
            "cluster_id": "cluster-b",
            "node_id": "edge-b",
            "node_region": "beira",
        },
        format="json",
    )
    assert assign_a.status_code == 201
    assert assign_b.status_code == 201

    deploy = api_client.post(
        "/api/v1/monitoring/cloud_control/",
        {
            "action": "deploy_module",
            "cluster_id": "cluster-a",
            "module_key": "substrato.modules.financeiro",
            "module_version": "1.2.0",
            "desired_replicas": 1,
        },
        format="json",
    )
    assert deploy.status_code == 201
    deployment_id = deploy.data["deployment"]["deployment_id"]

    reconcile = api_client.post(
        "/api/v1/monitoring/cloud_control/",
        {
            "action": "reconcile_deployment",
            "deployment_id": deployment_id,
        },
        format="json",
    )
    assert reconcile.status_code == 200
    assert reconcile.data["tasks_enqueued"] == 1

    failover = api_client.post(
        "/api/v1/monitoring/cloud_control/",
        {
            "action": "failover_cluster",
            "source_cluster_id": "cluster-a",
            "target_cluster_id": "cluster-b",
        },
        format="json",
    )
    assert failover.status_code == 200
    assert failover.data["result"]["migrated_deployments"] == 1
    assert failover.data["result"]["tasks_enqueued"] == 1

    deployments = api_client.get(
        "/api/v1/monitoring/cloud_control/",
        {"resource": "deployments"},
    )
    assert deployments.status_code == 200
    assert len(deployments.data["deployments"]) >= 2
