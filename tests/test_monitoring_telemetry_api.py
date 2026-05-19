import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.monitoring.models import SystemError, TransactionalOutboxEvent
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _tenant():
    return Tenant.objects.create(
        identifier="tn-monitoring",
        name="Tenant Monitoring",
        domain="monitoring.local",
        active=True,
    )


def _authenticate(api_client, tenant: Tenant, *, username: str, is_staff: bool):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="testpass123",
        tenant=tenant,
    )
    user.is_staff = is_staff
    user.save(update_fields=["is_staff"])

    if is_staff:
        admin_group, _ = Group.objects.get_or_create(name="Administrador")
        user.groups.add(admin_group)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_frontend_telemetry_ingestion_accepts_authenticated_user(api_client):
    tenant = _tenant()
    _authenticate(api_client, tenant, username="telemetry_user", is_staff=False)

    response = api_client.post(
        "/api/v1/monitoring/telemetry/",
        {
            "event_type": "frontend.window_error",
            "message": "Unhandled TypeError in dashboard chart",
            "error_name": "TypeError",
            "path": "/statistics",
            "status_code": 500,
            "metadata": {"component": "ErrorStatsChart"},
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)

    payload = _response_data(response)
    created = SystemError.objects.get(pk=payload["id"])

    assert created.tenant_id == tenant.id
    assert created.method == "FRONTEND"
    assert created.status_code == 500
    assert created.path == "/statistics"
    assert created.exception_class == "TypeError"
    assert created.metadata.get("source") == "frontend"
    assert created.metadata.get("event_type") == "frontend.window_error"


@pytest.mark.django_db
def test_telemetry_summary_requires_admin_permissions(api_client):
    tenant = _tenant()
    _authenticate(api_client, tenant, username="non_admin", is_staff=False)

    response = api_client.get("/api/v1/monitoring/telemetry/?days=7")

    assert response.status_code == 403


@pytest.mark.django_db
def test_telemetry_summary_aggregates_errors_and_outbox(api_client):
    tenant = _tenant()
    _authenticate(api_client, tenant, username="admin_monitor", is_staff=True)

    SystemError.objects.create(
        tenant=tenant,
        method="FRONTEND",
        path="/statistics",
        full_path="/statistics",
        status_code=500,
        exception_class="TypeError",
        message="Frontend chart failed",
        metadata={"source": "frontend"},
    )
    SystemError.objects.create(
        tenant=tenant,
        method="GET",
        path="/api/v1/clinical/labrequest/",
        full_path="/api/v1/clinical/labrequest/",
        status_code=503,
        exception_class="OperationalError",
        message="DB unavailable",
        metadata={},
    )

    TransactionalOutboxEvent.objects.create(
        event_type="billing.invoice.issued",
        tenant_identifier=tenant.identifier,
        status=TransactionalOutboxEvent.Status.PENDING,
        payload={"invoice_id": "INV-1"},
    )
    TransactionalOutboxEvent.objects.create(
        event_type="billing.invoice.issued",
        tenant_identifier=tenant.identifier,
        status=TransactionalOutboxEvent.Status.DELIVERED,
        payload={"invoice_id": "INV-2"},
    )

    response = api_client.get("/api/v1/monitoring/telemetry/?days=30&top=10")

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)

    assert data["totals"]["errors_total"] == 2
    assert data["totals"]["frontend_errors"] == 1
    assert data["totals"]["backend_errors"] == 1
    assert data["totals"]["server_5xx"] == 2
    assert data["outbox"]["total"] == 2
    assert data["outbox"]["pending"] == 1
    assert data["outbox"]["delivered"] == 1
    assert len(data["timeline"]) >= 1
    assert any(item["status_code"] == 500 for item in data["by_status"])
