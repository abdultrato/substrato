"""Testes para o endpoint PDF de relatório de actividades por página."""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.audit_activities.models.user_activity import UserActivity
from apps.tenants.models.tenant import Tenant
from security.permissions.rbac import GROUPS


def _tenant():
    return Tenant.objects.create(
        identifier="tn-activity-pdf",
        name="Tenant Activity PDF",
        domain="tenant-activity-pdf.local",
        active=True,
    )


def _user(tenant: Tenant, username: str, group_name: str):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name=group_name)
    user.groups.add(group)
    return user


def _activity(tenant: Tenant, user, *, referer: str, status_code: int = 200):
    return UserActivity.objects.create(
        tenant=tenant,
        user=user,
        method="GET",
        path="/api/v1/billing/invoice/",
        full_path="/api/v1/billing/invoice/?page=1",
        status_code=status_code,
        duration_ms=42,
        ip="127.0.0.1",
        user_agent="pytest",
        view_basename="billing-invoice",
        view_action="list",
        object_id="",
        message="",
        metadata={"referer": referer},
    )


@pytest.mark.django_db
def test_activity_report_pdf_returns_pdf_for_admin_with_page_filter(api_client):
    tenant = _tenant()
    admin = _user(tenant, "admin_activity_pdf", GROUPS["ADMIN"])
    other = _user(tenant, "operador_activity_pdf", GROUPS["RECEPCAO"])

    _activity(tenant, admin, referer="http://tenant-activity-pdf.local/invoices", status_code=200)
    _activity(tenant, other, referer="http://tenant-activity-pdf.local/invoices", status_code=500)
    _activity(tenant, other, referer="http://tenant-activity-pdf.local/patients", status_code=200)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=admin)

    response = api_client.get(
        "/api/v1/audit/atividade/relatorio/pdf/",
        {
            "period": "weekly",
            "mode": "complete",
            "page_path": "/invoices",
        },
    )

    assert response.status_code == 200
    assert "application/pdf" in response["Content-Type"]
    assert len(response.content) > 0
    assert response["X-Report-Scope"] == "tenant"
    assert response["X-Activity-Count"] == "2"


@pytest.mark.django_db
def test_activity_report_pdf_scopes_non_admin_to_own_activities(api_client):
    tenant = _tenant()
    user_a = _user(tenant, "recepcao_activity_pdf_a", GROUPS["RECEPCAO"])
    user_b = _user(tenant, "recepcao_activity_pdf_b", GROUPS["RECEPCAO"])

    _activity(tenant, user_a, referer="http://tenant-activity-pdf.local/invoices", status_code=200)
    _activity(tenant, user_b, referer="http://tenant-activity-pdf.local/invoices", status_code=200)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user_a)

    response = api_client.get(
        "/api/v1/audit/atividade/relatorio/pdf/",
        {
            "period": "weekly",
            "mode": "complete",
            "page_path": "/invoices",
        },
    )

    assert response.status_code == 200
    assert "application/pdf" in response["Content-Type"]
    assert len(response.content) > 0
    assert response["X-Report-Scope"] == "user"
    assert response["X-Activity-Count"] == "1"
