import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.audit_activities.models.user_activity import UserActivity
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
    admin_user = _authenticate(api_client, tenant, username="admin_monitor", is_staff=True)

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
    UserActivity.objects.create(
        tenant=tenant,
        user=admin_user,
        method="GET",
        path="/api/v1/clinical/patient/",
        full_path="/api/v1/clinical/patient/?page=1",
        status_code=404,
        message="Not found",
    )
    UserActivity.objects.create(
        tenant=tenant,
        user=admin_user,
        method="POST",
        path="/api/v1/clinical/resultitem/",
        full_path="/api/v1/clinical/resultitem/",
        status_code=500,
        message="Internal Server Error",
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
    assert data["activity_totals"]["errors_total"] == 2
    assert data["activity_totals"]["client_4xx"] == 1
    assert data["activity_totals"]["server_5xx"] == 1
    assert data["activity_totals"]["unique_paths"] == 2
    assert data["outbox"]["total"] == 2
    assert data["outbox"]["pending"] == 1
    assert data["outbox"]["delivered"] == 1
    assert len(data["timeline"]) >= 1
    assert any(item["status_code"] == 500 for item in data["by_status"])


@pytest.mark.django_db
def test_command_center_returns_module_health_and_alerts(api_client):
    tenant = _tenant()
    admin_user = _authenticate(api_client, tenant, username="admin_command_center", is_staff=True)

    UserActivity.objects.create(
        tenant=tenant,
        user=admin_user,
        method="GET",
        path="/api/v1/clinical/labrequest/",
        full_path="/api/v1/clinical/labrequest/?page=1",
        status_code=200,
        duration_ms=120,
    )
    UserActivity.objects.create(
        tenant=tenant,
        user=admin_user,
        method="POST",
        path="/api/v1/clinical/resultitem/",
        full_path="/api/v1/clinical/resultitem/",
        status_code=500,
        duration_ms=220,
        message="Failure",
    )
    UserActivity.objects.create(
        tenant=tenant,
        user=admin_user,
        method="GET",
        path="/api/v1/pharmacy/product/",
        full_path="/api/v1/pharmacy/product/",
        status_code=404,
        duration_ms=90,
        message="Not found",
    )

    SystemError.objects.create(
        tenant=tenant,
        method="GET",
        path="/api/v1/clinical/resultitem/",
        full_path="/api/v1/clinical/resultitem/",
        status_code=502,
        exception_class="BadGateway",
        message="Gateway error",
        metadata={},
    )

    TransactionalOutboxEvent.objects.create(
        event_type="clinical.request.created",
        tenant_identifier=tenant.identifier,
        status=TransactionalOutboxEvent.Status.PENDING,
        payload={"request_id": "REQ-1"},
    )
    TransactionalOutboxEvent.objects.create(
        event_type="clinical.request.created",
        tenant_identifier=tenant.identifier,
        status=TransactionalOutboxEvent.Status.FAILED,
        payload={"request_id": "REQ-2"},
    )

    response = api_client.get(
        "/api/v1/monitoring/telemetry/command_center/?days=30&slo_target=99&route_5xx_threshold=1&server_5xx_threshold=1"
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)

    assert data["global_totals"]["total_requests"] == 3
    assert data["global_totals"]["client_4xx"] == 1
    assert data["global_totals"]["server_5xx"] == 1
    assert data["outbox"]["pending"] == 1
    assert data["outbox"]["failed_or_dead_letter"] == 1
    assert len(data["scheduled_reports"]) >= 3
    assert any(item["module_key"] == "clinical" for item in data["modules"])
    assert any(item["category"] == "critical_route" for item in data["alerts"])
