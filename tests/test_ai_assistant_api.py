from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.ai_assistant.models import AiMessage, AiPolicyEvent, AiSession, AiSuggestedAction, AiToolCall
from apps.ai_assistant.services.redaction import redact_value
from apps.ai_assistant.services.registry import AiToolRegistry
from apps.audit_activities.models.user_activity import UserActivity
from apps.monitoring.models import SystemError, TransactionalOutboxEvent
from apps.tenants.models.tenant import Tenant
from security.permissions.rbac import GROUPS


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return response.json()


def _tenant(identifier="tn-ai", domain="tn-ai.local"):
    return Tenant.objects.create(identifier=identifier, name=f"Tenant {identifier}", domain=domain, active=True)


def _user(tenant: Tenant, username: str, group_name: str | None = None, *, is_staff=False):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="testpass123",
        tenant=tenant,
        is_staff=is_staff,
    )
    if group_name:
        group, _ = Group.objects.get_or_create(name=group_name)
        user.groups.add(group)
    return user


def _authenticate(api_client, tenant: Tenant, user):
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)


def _seed_command_center_data(tenant: Tenant, user):
    UserActivity.objects.create(
        tenant=tenant,
        user=user,
        method="GET",
        path="/api/v1/clinical/labrequest/",
        full_path="/api/v1/clinical/labrequest/",
        status_code=200,
        duration_ms=120,
    )
    UserActivity.objects.create(
        tenant=tenant,
        user=user,
        method="POST",
        path="/api/v1/clinical/resultitem/",
        full_path="/api/v1/clinical/resultitem/",
        status_code=500,
        duration_ms=230,
        message="Internal Server Error",
    )
    SystemError.objects.create(
        tenant=tenant,
        user=user,
        method="POST",
        path="/api/v1/clinical/resultitem/",
        full_path="/api/v1/clinical/resultitem/",
        status_code=503,
        exception_class="OperationalError",
        message="database unavailable",
        metadata={"email": "patient@example.com"},
    )
    TransactionalOutboxEvent.objects.create(
        event_type="clinical.request.created",
        tenant_identifier=tenant.identifier,
        status=TransactionalOutboxEvent.Status.FAILED,
        payload={"request_id": "REQ-1"},
    )


@pytest.mark.django_db
def test_ai_chat_requires_authentication(api_client):
    tenant = _tenant(identifier="tn-ai-auth", domain="tn-ai-auth.local")
    api_client.defaults["HTTP_HOST"] = tenant.domain

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "Quais alertas activos existem agora?"},
        format="json",
    )

    assert response.status_code in {401, 403}


@pytest.mark.django_db
def test_ai_command_center_chat_returns_sources_and_audit(api_client):
    tenant = _tenant()
    admin = _user(tenant, "admin_ai", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)
    _seed_command_center_data(tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Quais alertas activos existem agora nos últimos 7 dias?",
            "language": "pt",
            "active_module": "monitoring",
            "context": {"filters": {"days": 7}},
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)

    assert data["session_id"]
    assert "Evidência interna" in data["answer"]
    assert any(source["label"] == "Command Center" for source in data["sources"])
    assert any(call["tool_name"] == "get_command_center_alerts" and call["status"] == "success" for call in data["tool_calls"])
    assert any(action["action_type"] == "open_filtered_navigation" for action in data["suggested_actions"])

    session = AiSession.objects.get(id=data["session_id"])
    assert session.tenant_id == tenant.id
    assert session.user_id == admin.id
    assert AiMessage.objects.filter(session=session, role=AiMessage.Role.USER).count() == 1
    assert AiMessage.objects.filter(session=session, role=AiMessage.Role.ASSISTANT).count() == 1
    assert AiToolCall.objects.filter(session=session, tool_name="get_command_center_alerts", status=AiToolCall.Status.SUCCESS).exists()
    assert AiSuggestedAction.objects.filter(session=session, action_type="open_filtered_navigation").exists()


@pytest.mark.django_db
def test_ai_tool_registry_respects_rbac_and_logs_policy(api_client):
    tenant = _tenant(identifier="tn-ai-rbac", domain="tn-ai-rbac.local")
    user = _user(tenant, "recepcao_ai", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "Quais alertas activos existem agora?", "language": "pt", "active_module": "monitoring"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem permissão" in data["answer"].lower()
    assert any(call["status"] == "blocked" for call in data["tool_calls"])
    assert AiPolicyEvent.objects.filter(tenant=tenant, user=user, policy_key="tool_rbac_denied", blocked=True).exists()


@pytest.mark.django_db
def test_ai_chat_is_tenant_scoped_when_reusing_session_id(api_client):
    tenant_a = _tenant(identifier="tn-ai-a", domain="tn-ai-a.local")
    tenant_b = _tenant(identifier="tn-ai-b", domain="tn-ai-b.local")
    admin_a = _user(tenant_a, "admin_ai_a", GROUPS["ADMIN"], is_staff=True)
    admin_b = _user(tenant_b, "admin_ai_b", GROUPS["ADMIN"], is_staff=True)
    session_a = AiSession.objects.create(tenant=tenant_a, user=admin_a, title="A", language="pt")

    _authenticate(api_client, tenant_b, admin_b)
    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "session_id": session_a.id,
            "message": "Quais alertas activos existem agora?",
            "language": "pt",
            "active_module": "monitoring",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert data["session_id"] != session_a.id
    assert AiSession.objects.get(id=data["session_id"]).tenant_id == tenant_b.id


@pytest.mark.django_db
def test_ai_confirm_action_revalidates_permissions(api_client):
    tenant = _tenant(identifier="tn-ai-action", domain="tn-ai-action.local")
    admin = _user(tenant, "admin_ai_action", GROUPS["ADMIN"], is_staff=True)
    regular_user = _user(tenant, "regular_ai_action", GROUPS["RECEPCAO"])
    session = AiSession.objects.create(tenant=tenant, user=admin, title="Ação", language="pt")
    action = AiSuggestedAction.objects.create(
        tenant=tenant,
        session=session,
        created_by=admin,
        action_type="prepare_sensitive_report",
        payload={"href": "/monitoring/export_job/abc"},
        payload_redacted={"href": "/monitoring/export_job/abc"},
        requires_confirmation=True,
        confirmation_summary="Gerar relatório sensível.",
    )

    _authenticate(api_client, tenant, regular_user)
    response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert response.status_code == 403, _response_data(response)
    action.refresh_from_db()
    assert action.status == AiSuggestedAction.Status.PENDING_CONFIRMATION


def test_ai_redacts_sensitive_fields():
    redacted = redact_value(
        {
            "email": "patient@example.com",
            "message": "Contacto +258 84 123 4567 e token abcdefghijklmnopqrstuvwxyz123456",
            "nested": {"password": "secret"},
        }
    )

    assert redacted["email"] == "[redigido]"
    assert "[telefone-redigido]" in redacted["message"]
    assert "[segredo-redigido]" in redacted["message"]
    assert redacted["nested"]["password"] == "[redigido]"


def test_ai_tool_registry_selects_domain_tools():
    registry = AiToolRegistry()

    clinical_names = {tool.name for tool in registry.select_tools(message="mostra frasco e amostra da REQ-20260520-0001", active_module="ai")}
    finance_names = {tool.name for tool in registry.select_tools(message="resumo financeiro de faturas e pagamentos", active_module="ai")}
    education_names = {tool.name for tool in registry.select_tools(message="resumo de estudantes e matrículas", active_module="ai")}

    assert "get_lab_request_collection_guidance" in clinical_names
    assert "get_financial_operational_summary" in finance_names
    assert "get_education_summary" in education_names
