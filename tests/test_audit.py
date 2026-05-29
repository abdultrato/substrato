from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.utils import timezone
import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.tenants.models.tenant import Tenant
from infrastructure.middleware.audit import _persist_activity
from observability.audit import ActiveUsersView, register_cloud_event, register_event


def test_register_event_logs_structured_context():
    user = SimpleNamespace(id=42)

    with patch("observability.audit.logger.info") as logger_info:
        register_event(
            user=user,
            tenant_id=7,
            path="/api/v1/billing/invoice/",
            method="POST",
            status_code=201,
        )

    logger_info.assert_called_once_with(
        "AUDIT",
        extra={
            "user_id": 42,
            "tenant_id": 7,
            "endpoint": "/api/v1/billing/invoice/",
            "method": "POST",
            "status": 201,
        },
    )


def test_register_cloud_event_logs_structured_context():
    with patch("observability.audit.logger.info") as logger_info:
        register_cloud_event(
            action="cluster_failover",
            status="completed",
            source_cluster_id="cluster-a",
            target_cluster_id="cluster-b",
            deployment_id="dep-1",
            details={"migrated_deployments": 1, "tasks_enqueued": 2},
        )

    logger_info.assert_called_once_with(
        "AUDIT_CLOUD",
        extra={
            "action": "cluster_failover",
            "status": "completed",
            "source_cluster_id": "cluster-a",
            "target_cluster_id": "cluster-b",
            "deployment_id": "dep-1",
            "details": {"migrated_deployments": 1, "tasks_enqueued": 2},
        },
    )


def test_persist_activity_uses_async_executor_by_default(settings):
    settings.AUDIT_ACTIVITY_ASYNC = True
    executor = Mock()

    with patch("infrastructure.middleware.audit._get_executor", return_value=executor):
        _persist_activity({"tenant_id": 1, "path": "/api/v1/patients/"})

    executor.submit.assert_called_once()


def test_persist_activity_can_run_synchronously(settings):
    settings.AUDIT_ACTIVITY_ASYNC = False

    with patch("infrastructure.middleware.audit._create_activity") as create_activity:
        _persist_activity({"tenant_id": 1, "path": "/api/v1/patients/"})

    create_activity.assert_called_once_with({"tenant_id": 1, "path": "/api/v1/patients/"})


@pytest.mark.django_db
def test_active_users_view_returns_only_recent_logins():
    user_model = get_user_model()
    tenant = Tenant.objects.create(identifier="tn-audit", name="Tenant Audit", domain="audit.local", active=True)

    admin = user_model.objects.create_user(
        username="audit_admin",
        email="audit-admin@example.com",
        password="testpass123",
        is_staff=True,
        tenant=tenant,
    )
    recent = user_model.objects.create_user(
        username="recent_user",
        email="recent@example.com",
        password="testpass123",
        tenant=tenant,
    )
    stale = user_model.objects.create_user(
        username="stale_user",
        email="stale@example.com",
        password="testpass123",
        tenant=tenant,
    )

    recent.last_login = timezone.now() - timezone.timedelta(hours=2)
    recent.save(update_fields=["last_login"])

    stale.last_login = timezone.now() - timezone.timedelta(days=3)
    stale.save(update_fields=["last_login"])

    request = APIRequestFactory().get("/api/v1/audit/active-users/")
    force_authenticate(request, user=admin)

    response = ActiveUsersView.as_view()(request)

    assert response.status_code == 200
    usernames = {row["username"] for row in response.data["active_users_last_24h"]}
    assert "recent_user" in usernames
    assert "stale_user" not in usernames
