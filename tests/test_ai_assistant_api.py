from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.ai_assistant.models import (
    AiInvestigation,
    AiMessage,
    AiOperationalTask,
    AiPolicyEvent,
    AiSession,
    AiSuggestedAction,
    AiToolCall,
)
from apps.ai_assistant.services.redaction import redact_value
from apps.ai_assistant.services.registry import AiToolRegistry
from apps.accounting.models.account import Account
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement
from apps.audit_activities.models.user_activity import UserActivity
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.billing.models.invoice_items import InvoiceItem
from apps.bloodbank.models.blood_bank import (
    BloodDonation,
    BloodStockMovement,
    BloodStorage,
    BloodStorageMaintenance,
    BloodTransfusion,
    BloodUnit,
)
from apps.clinical.models import Patient
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.result_item import ResultItem
from apps.clinical.models.sample import Sample
from apps.monitoring.models import SystemError, TransactionalOutboxEvent
from apps.tenants.models.tenant import Tenant
from services.reports.async_exports import get_export_job_result, get_export_job_state
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
    assert data["investigation"]["intent"] == "operational_health"
    assert data["schema"]["investigation"]["id"] == data["investigation"]["id"]

    session = AiSession.objects.get(id=data["session_id"])
    assert session.tenant_id == tenant.id
    assert session.user_id == admin.id
    assert AiMessage.objects.filter(session=session, role=AiMessage.Role.USER).count() == 1
    assert AiMessage.objects.filter(session=session, role=AiMessage.Role.ASSISTANT).count() == 1
    assert AiToolCall.objects.filter(session=session, tool_name="get_command_center_alerts", status=AiToolCall.Status.SUCCESS).exists()
    assert AiSuggestedAction.objects.filter(session=session, action_type="open_filtered_navigation").exists()
    assert AiInvestigation.objects.filter(session=session, intent="operational_health").exists()


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
    assert data["investigation"]["status"] == "blocked"
    assert AiPolicyEvent.objects.filter(tenant=tenant, user=user, policy_key="tool_rbac_denied", blocked=True).exists()


@pytest.mark.django_db
def test_ai_personal_context_identifies_authenticated_user(api_client):
    tenant = _tenant(identifier="tn-ai-personal", domain="tn-ai-personal.local")
    user = _user(tenant, "recepcao_contexto", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "Quem sou eu neste sistema e que dados posso investigar?", "language": "pt", "active_module": "ai"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "recepcao_contexto" in data["answer"]
    assert GROUPS["RECEPCAO"] in data["answer"]
    assert any(call["tool_name"] == "get_user_context" and call["status"] == "success" for call in data["tool_calls"])
    assert any(call["tool_name"] == "explore_database" and call["status"] == "success" for call in data["tool_calls"])
    assert data["investigation"]["intent"] == "data_exploration"
    assert data["investigation"]["findings"]


@pytest.mark.django_db
def test_ai_data_explorer_counts_allowed_patient_resource(api_client):
    tenant = _tenant(identifier="tn-ai-data", domain="tn-ai-data.local")
    user = _user(tenant, "recepcao_data", GROUPS["RECEPCAO"])
    Patient.objects.create(tenant=tenant, name="Paciente A")
    Patient.objects.create(tenant=tenant, name="Paciente B")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "Quantos pacientes existem na base de dados?", "language": "pt", "active_module": "ai"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "Pacientes" in data["answer"]
    assert "2" in data["answer"]
    assert any(call["tool_name"] == "explore_database" and call["status"] == "success" for call in data["tool_calls"])
    assert data["investigation"]["intent"] == "data_exploration"
    assert data["investigation"]["findings"]


@pytest.mark.django_db
def test_ai_data_explorer_denies_resource_without_rbac(api_client):
    tenant = _tenant(identifier="tn-ai-data-denied", domain="tn-ai-data-denied.local")
    user = _user(tenant, "recepcao_sem_monitoring", GROUPS["RECEPCAO"])
    SystemError.objects.create(
        tenant=tenant,
        user=user,
        method="GET",
        path="/api/v1/admin-only/",
        full_path="/api/v1/admin-only/",
        status_code=500,
        exception_class="PermissionError",
        message="blocked",
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "Mostre erros do sistema registados", "language": "pt", "active_module": "ai"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    answer = data["answer"].lower()
    assert "não posso" in answer
    assert "não tem acesso" in answer
    assert any(call["tool_name"] == "explore_database" and call["status"] == "success" for call in data["tool_calls"])
    assert data["investigation"]["status"] == "blocked"


@pytest.mark.django_db
def test_ai_conversational_crud_collects_patient_data_then_creates_record(api_client):
    tenant = _tenant(identifier="tn-ai-crud", domain="tn-ai-crud.local")
    user = _user(tenant, "recepcao_ai_crud", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    first_response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "Crie um paciente", "language": "pt", "active_module": "ai"},
        format="json",
    )

    assert first_response.status_code == 200, _response_data(first_response)
    first_data = _response_data(first_response)
    assert "fluxo conversacional" in first_data["answer"]
    assert not first_data["suggested_actions"]
    assert any(call["tool_name"] == "prepare_crud_operation" and call["status"] == "success" for call in first_data["tool_calls"])

    session = AiSession.objects.get(id=first_data["session_id"])
    assert session.metadata["crud_draft"]["resource_basename"] == "clinical-patient"

    second_response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "session_id": first_data["session_id"],
            "message": "nome Paciente Conversa",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert second_response.status_code == 200, _response_data(second_response)
    second_data = _response_data(second_response)
    action_payload = next(action for action in second_data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "clinical-patient"
    assert action.payload["data"]["name"] == "Paciente Conversa"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    assert Patient.objects.filter(tenant=tenant, name="Paciente Conversa").exists()
    action.refresh_from_db()
    assert action.status == AiSuggestedAction.Status.CONFIRMED
    session.refresh_from_db()
    assert "crud_draft" not in session.metadata


@pytest.mark.django_db
def test_ai_conversational_crud_prepares_direct_patient_create(api_client):
    tenant = _tenant(identifier="tn-ai-crud-direct", domain="tn-ai-crud-direct.local")
    user = _user(tenant, "recepcao_ai_crud_direct", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie paciente nome Paciente Direto contacto +258 84 111 2222",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["data"]["name"] == "Paciente Direto"
    assert action.payload["data"]["contact"] == "+258 84 111 2222"


@pytest.mark.django_db
def test_ai_conversational_crud_updates_patient_after_confirmation(api_client):
    tenant = _tenant(identifier="tn-ai-crud-update", domain="tn-ai-crud-update.local")
    user = _user(tenant, "recepcao_ai_crud_update", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Antigo")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Altere paciente id {patient.id} nome Paciente Actualizado",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_update")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["object_ref"] == str(patient.id)
    assert action.payload["data"]["name"] == "Paciente Actualizado"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    patient.refresh_from_db()
    assert patient.name == "Paciente Actualizado"


@pytest.mark.django_db
def test_ai_conversational_crud_deletes_patient_after_confirmation(api_client):
    tenant = _tenant(identifier="tn-ai-crud-delete", domain="tn-ai-crud-delete.local")
    admin = _user(tenant, "admin_ai_crud_delete", GROUPS["ADMIN"], is_staff=True)
    patient = Patient.objects.create(tenant=tenant, name="Paciente Removivel")
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Remova paciente id {patient.id}",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_delete")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["object_ref"] == str(patient.id)

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    removed = Patient.all_objects.get(id=patient.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_conversational_crud_denies_write_without_resource_permission(api_client):
    tenant = _tenant(identifier="tn-ai-crud-denied", domain="tn-ai-crud-denied.local")
    user = _user(tenant, "enfermagem_ai_crud_denied", GROUPS["ENFERMAGEM"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "Crie paciente nome Paciente Bloqueado", "language": "pt", "active_module": "ai"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not Patient.objects.filter(tenant=tenant, name="Paciente Bloqueado").exists()


@pytest.mark.django_db
def test_ai_clinical_crud_creates_sample_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-clinical-sample", domain="tn-ai-clinical-sample.local")
    admin = _user(tenant, "admin_ai_clinical_sample", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                "Crie amostra nome Expectoracao GeneXpert tipo frasco FRASCO_ESTERIL "
                "volume minimo 2 jejum nao horas jejum 0 temperatura 2-8C anticoagulante nenhum"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "clinical-sample"
    assert action.payload["data"]["name"] == "Expectoracao GeneXpert"
    assert action.payload["data"]["bottle_type"] == "FRASCO_ESTERIL"
    assert action.payload["data"]["minimum_volume_ml"] == "2"
    assert action.payload["data"]["fasting_required"] is False

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    sample = Sample.objects.get(tenant=tenant, name__iexact="Expectoracao GeneXpert")
    assert sample.bottle_type == "FRASCO_ESTERIL"
    assert str(sample.minimum_volume_ml) == "2.00"


@pytest.mark.django_db
def test_ai_clinical_crud_creates_lab_exam_with_sample_options(api_client):
    tenant = _tenant(identifier="tn-ai-clinical-exam", domain="tn-ai-clinical-exam.local")
    admin = _user(tenant, "admin_ai_clinical_exam", GROUPS["ADMIN"], is_staff=True)
    sputum = Sample.objects.create(
        tenant=tenant,
        name="Expectoracao",
        bottle_type="FRASCO_ESTERIL",
        minimum_volume_ml="2.00",
    )
    stool = Sample.objects.create(
        tenant=tenant,
        name="Fezes",
        bottle_type="FRASCO_FEZES",
        minimum_volume_ml="5.00",
    )
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                "Crie exame laboratorial nome GeneXpert MTB metodo PCRTempoReal "
                f"setor BiologiaMolecular amostra {sputum.custom_id} amostras {sputum.custom_id} e {stool.custom_id} preco 1200"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "clinical-exam"
    assert action.payload["data"]["sample_type"] == sputum.id
    assert action.payload["data"]["sample_options"] == [sputum.id, stool.id]

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    exam = LabExam.objects.get(tenant=tenant, name__iexact="GeneXpert MTB")
    assert exam.sample_type_id == sputum.id
    assert set(exam.sample_options.values_list("id", flat=True)) == {sputum.id, stool.id}


@pytest.mark.django_db
def test_ai_clinical_crud_creates_exam_field_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-clinical-field", domain="tn-ai-clinical-field.local")
    admin = _user(tenant, "admin_ai_clinical_field", GROUPS["ADMIN"], is_staff=True)
    sample = Sample.objects.create(tenant=tenant, name="Soro", bottle_type="TUBO_SECO")
    exam = LabExam.objects.create(
        tenant=tenant,
        name="Glicemia",
        method="Enzimatico",
        sector="Bioquimica",
        sample_type=sample,
        price="250.00",
    )
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                f"Crie campo de exame laboratorial exame {exam.custom_id} nome Glicose "
                "tipo NUMERICO unidade mg/dl referencia minima 70 referencia maxima 110"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "clinical-examfield"
    assert action.payload["data"]["exam"] == exam.id
    assert action.payload["data"]["type"] == "NUMERICO"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    field = LabExamField.objects.get(tenant=tenant, exam=exam, name="Glicose")
    assert field.reference_min == 70
    assert field.reference_max == 110


@pytest.mark.django_db
def test_ai_clinical_crud_creates_lab_request_and_domain_items_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-clinical-request", domain="tn-ai-clinical-request.local")
    user = _user(tenant, "recepcao_ai_clinical_request", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente GeneXpert")
    sample = Sample.objects.create(tenant=tenant, name="Expectoracao", bottle_type="FRASCO_ESTERIL")
    exam = LabExam.objects.create(
        tenant=tenant,
        name="GeneXpert MTB",
        method="PCRTempoReal",
        sector="BiologiaMolecular",
        sample_type=sample,
        price="1200.00",
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                f"Crie requisição clínica paciente {patient.custom_id} exames {exam.custom_id} "
                "tipo LAB prioridade URGENTE"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "clinical-labrequest"
    assert action.payload["data"]["patient"] == patient.id
    assert action.payload["data"]["exams"] == [exam.id]
    assert action.payload["data"]["clinical_status"] == "URGENTE"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    request = LabRequest.objects.get(tenant=tenant, patient=patient)
    assert request.items.filter(exam=exam).exists()
    assert request.samples.filter(id=sample.id).exists()


@pytest.mark.django_db
def test_ai_clinical_crud_blocks_manual_request_item_and_result_changes(api_client):
    tenant = _tenant(identifier="tn-ai-clinical-blocked", domain="tn-ai-clinical-blocked.local")
    admin = _user(tenant, "admin_ai_clinical_blocked", GROUPS["ADMIN"], is_staff=True)
    patient = Patient.objects.create(tenant=tenant, name="Paciente Bloqueio Clínico")
    sample = Sample.objects.create(tenant=tenant, name="Soro Bloqueio", bottle_type="TUBO_SECO")
    exam = LabExam.objects.create(
        tenant=tenant,
        name="Bioquimica Bloqueio",
        method="Enzimatico",
        sector="Bioquimica",
        sample_type=sample,
        price="300.00",
    )
    field = LabExamField.objects.create(
        tenant=tenant,
        exam=exam,
        name="Marcador",
        type="NUMERICO",
        unit="mg/dl",
    )
    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    request.add_exam(exam)
    result_item = ResultItem.objects.get(result__request=request, exam_field=field)
    _authenticate(api_client, tenant, admin)

    item_response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Crie item de requisição requisição {request.custom_id} exame {exam.custom_id}",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )
    result_response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Altere resultado laboratorial id {result_item.id} valor 12",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert item_response.status_code == 200, _response_data(item_response)
    assert result_response.status_code == 200, _response_data(result_response)
    item_data = _response_data(item_response)
    result_data = _response_data(result_response)
    assert "não posso preparar" in item_data["answer"].lower()
    assert "não posso preparar" in result_data["answer"].lower()
    assert not item_data["suggested_actions"]
    assert not result_data["suggested_actions"]
    assert LabRequestItem.objects.filter(tenant=tenant, request=request).count() == 1


@pytest.mark.django_db
def test_ai_accounting_crud_creates_account_for_accounting_group(api_client):
    tenant = _tenant(identifier="tn-ai-accounting-crud", domain="tn-ai-accounting-crud.local")
    user = _user(tenant, "contabilidade_ai_crud", GROUPS["CONTABILIDADE"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie conta contabil nome Caixa Operacional tipo ativo",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "accounting-account"
    assert action.payload["data"]["name"] == "Caixa Operacional"
    assert action.payload["data"]["type"] == "ATI"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    account = Account.objects.get(tenant=tenant, name="Caixa Operacional")
    assert account.type == "ATI"


@pytest.mark.django_db
def test_ai_accounting_crud_updates_account_for_accounting_group(api_client):
    tenant = _tenant(identifier="tn-ai-accounting-update", domain="tn-ai-accounting-update.local")
    user = _user(tenant, "contabilidade_ai_update", GROUPS["CONTABILIDADE"])
    account = Account.objects.create(tenant=tenant, name="Conta Antiga", type="DES")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Altere conta contabil id {account.id} nome Banco Principal tipo passivo",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_update")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "accounting-account"
    assert action.payload["data"]["type"] == "PAS"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    account.refresh_from_db()
    assert account.name == "Banco Principal"
    assert account.type == "PAS"


@pytest.mark.django_db
def test_ai_accounting_crud_creates_movement_resolving_related_codes(api_client):
    tenant = _tenant(identifier="tn-ai-accounting-movement", domain="tn-ai-accounting-movement.local")
    user = _user(tenant, "contabilidade_ai_movement", GROUPS["CONTABILIDADE"])
    account = Account.objects.create(tenant=tenant, name="Caixa Movimento", type="ATI")
    entry = LegacyEntry.objects.create(tenant=tenant, name="Lancamento Movimento", external_reference="DOC-IA")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                "Crie movimento contabil nome Debito Caixa "
                f"lançamento {entry.custom_id} conta {account.custom_id} débito 150"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "accounting-movement"
    assert action.payload["data"]["entry"] == entry.id
    assert action.payload["data"]["account"] == account.id
    assert action.payload["data"]["debit"] == "150"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    movement = LegacyMovement.objects.get(tenant=tenant, name="Debito Caixa")
    assert movement.entry_id == entry.id
    assert movement.account_id == account.id
    assert str(movement.debit) == "150.00"


@pytest.mark.django_db
def test_ai_accounting_crud_deletes_ledger_entry_after_confirmation(api_client):
    tenant = _tenant(identifier="tn-ai-accounting-delete", domain="tn-ai-accounting-delete.local")
    user = _user(tenant, "contabilidade_ai_delete", GROUPS["CONTABILIDADE"])
    entry = LegacyEntry.objects.create(tenant=tenant, name="Lancamento Removivel")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Remova lançamento contabil id {entry.id}",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_delete")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "accounting-entry"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    removed = LegacyEntry.all_objects.get(id=entry.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_audit_activity_crud_creates_activity_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-audit-crud", domain="tn-ai-audit-crud.local")
    admin = _user(tenant, "admin_ai_audit_crud", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                "Crie atividade de auditoria método POST rota /api/v1/audit/teste/ "
                "status 201 duração 45 mensagem Registo manual"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "audit-atividade"
    assert action.payload["data"]["method"] == "POST"
    assert action.payload["data"]["path"] == "/api/v1/audit/teste/"
    assert action.payload["data"]["status_code"] == 201
    assert action.payload["data"]["duration_ms"] == 45

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    activity = UserActivity.objects.get(tenant=tenant, path="/api/v1/audit/teste/")
    assert activity.method == "POST"
    assert activity.status_code == 201
    assert activity.duration_ms == 45
    assert activity.message == "Registo manual"


@pytest.mark.django_db
def test_ai_audit_activity_crud_updates_activity_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-audit-update", domain="tn-ai-audit-update.local")
    admin = _user(tenant, "admin_ai_audit_update", GROUPS["ADMIN"], is_staff=True)
    activity = UserActivity.objects.create(
        tenant=tenant,
        user=admin,
        method="GET",
        path="/api/v1/audit/original/",
        status_code=200,
        message="Original",
    )
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Altere atividade de auditoria id {activity.id} status 500 mensagem Erro actualizado",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_update")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "audit-atividade"
    assert action.payload["object_ref"] == str(activity.id)
    assert action.payload["data"]["status_code"] == 500

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    activity.refresh_from_db()
    assert activity.status_code == 500
    assert activity.message == "Erro actualizado"


@pytest.mark.django_db
def test_ai_audit_activity_crud_deletes_activity_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-audit-delete", domain="tn-ai-audit-delete.local")
    admin = _user(tenant, "admin_ai_audit_delete", GROUPS["ADMIN"], is_staff=True)
    activity = UserActivity.objects.create(
        tenant=tenant,
        user=admin,
        method="GET",
        path="/api/v1/audit/remover/",
        status_code=200,
    )
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Remova atividade de auditoria id {activity.id}",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_delete")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "audit-atividade"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    removed = UserActivity.all_objects.get(id=activity.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_audit_activity_crud_denies_non_admin_write(api_client):
    tenant = _tenant(identifier="tn-ai-audit-denied", domain="tn-ai-audit-denied.local")
    user = _user(tenant, "recepcao_ai_audit_denied", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie atividade de auditoria método GET rota /api/v1/bloqueado/",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not UserActivity.objects.filter(tenant=tenant, path="/api/v1/bloqueado/").exists()


@pytest.mark.django_db
def test_ai_billing_crud_creates_invoice_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-billing-crud", domain="tn-ai-billing-crud.local")
    user = _user(tenant, "recepcao_ai_billing", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Factura IA")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Crie factura paciente {patient.custom_id} origem clínico estado rascunho valor seguro 25",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "billing-invoice"
    assert action.payload["data"]["patient"] == patient.id
    assert action.payload["data"]["origin"] == Invoice.Origin.CLINICAL
    assert action.payload["data"]["status"] == Invoice.Status.DRAFT
    assert action.payload["data"]["insurance_amount"] == "25"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    invoice = Invoice.objects.get(tenant=tenant, patient=patient)
    assert invoice.origin == Invoice.Origin.CLINICAL
    assert invoice.status == Invoice.Status.DRAFT
    assert str(invoice.insurance_amount) == "25.00"


@pytest.mark.django_db
def test_ai_billing_crud_updates_invoice_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-billing-update", domain="tn-ai-billing-update.local")
    user = _user(tenant, "recepcao_ai_billing_update", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Factura Alterar")
    invoice = Invoice.objects.create(tenant=tenant, patient=patient, origin=Invoice.Origin.CLINICAL)
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Altere factura id {invoice.id} valor seguro 40 origem mista",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_update")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "billing-invoice"
    assert action.payload["data"]["insurance_amount"] == "40"
    assert action.payload["data"]["origin"] == Invoice.Origin.MIXED

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    invoice.refresh_from_db()
    assert invoice.origin == Invoice.Origin.MIXED
    assert str(invoice.insurance_amount) == "40.00"


@pytest.mark.django_db
def test_ai_billing_crud_creates_invoice_item_resolving_invoice_code(api_client):
    tenant = _tenant(identifier="tn-ai-billing-item", domain="tn-ai-billing-item.local")
    user = _user(tenant, "recepcao_ai_billing_item", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Item Factura")
    invoice = Invoice.objects.create(tenant=tenant, patient=patient, origin=Invoice.Origin.MIXED)
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                f"Crie item facturado na factura {invoice.custom_id} descrição Taxa administrativa "
                "tipo ajuste manual quantidade 2 preço unitário 50 iva 0"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "billing-invoiceitem"
    assert action.payload["data"]["invoice"] == invoice.id
    assert action.payload["data"]["item_type"] == InvoiceItem.TipoItem.AJUSTE
    assert action.payload["data"]["quantity"] == "2"
    assert action.payload["data"]["unit_price"] == "50"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    item = InvoiceItem.objects.get(tenant=tenant, invoice=invoice, description="Taxa administrativa")
    assert item.item_type == InvoiceItem.TipoItem.AJUSTE
    assert str(item.quantity) == "2.00"
    assert str(item.unit_price) == "50.00"
    invoice.refresh_from_db()
    assert str(invoice.total) == "100.00"


@pytest.mark.django_db
def test_ai_billing_crud_deletes_invoice_item_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-billing-delete", domain="tn-ai-billing-delete.local")
    admin = _user(tenant, "admin_ai_billing_delete", GROUPS["ADMIN"], is_staff=True)
    patient = Patient.objects.create(tenant=tenant, name="Paciente Item Remover")
    invoice = Invoice.objects.create(tenant=tenant, patient=patient, origin=Invoice.Origin.MIXED)
    item = InvoiceItem.objects.create(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.AJUSTE,
        description="Taxa removível",
        quantity="1.00",
        unit_price="20.00",
        vat_percentage="0.00",
    )
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Remova linha de factura id {item.id}",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_delete")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "billing-invoiceitem"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    removed = InvoiceItem.all_objects.get(id=item.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_billing_crud_creates_invoice_history_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-billing-history", domain="tn-ai-billing-history.local")
    admin = _user(tenant, "admin_ai_billing_history", GROUPS["ADMIN"], is_staff=True)
    patient = Patient.objects.create(tenant=tenant, name="Paciente Histórico Factura")
    invoice = Invoice.objects.create(tenant=tenant, patient=patient, origin=Invoice.Origin.MIXED)
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                f"Crie histórico de factura factura {invoice.custom_id} nome Ajuste manual "
                "evento AJUSTE descrição Correcção operacional"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "billing-invoicehistory"
    assert action.payload["data"]["invoice"] == invoice.id
    assert action.payload["data"]["name"] == "Ajuste manual"
    assert action.payload["data"]["event_type"] == "AJUSTE"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    history = InvoiceHistory.objects.get(tenant=tenant, invoice=invoice, event_type="AJUSTE")
    assert history.name == "Ajuste Manual"
    assert history.description == "Correcção operacional"


@pytest.mark.django_db
def test_ai_billing_crud_denies_invoice_item_delete_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-billing-denied", domain="tn-ai-billing-denied.local")
    user = _user(tenant, "recepcao_ai_billing_denied", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Item Bloqueado")
    invoice = Invoice.objects.create(tenant=tenant, patient=patient, origin=Invoice.Origin.MIXED)
    item = InvoiceItem.objects.create(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.AJUSTE,
        description="Taxa bloqueada",
        quantity="1.00",
        unit_price="20.00",
        vat_percentage="0.00",
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Remova linha de factura id {item.id}",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    item.refresh_from_db()
    assert item.deleted is False


@pytest.mark.django_db
def test_ai_bloodbank_crud_creates_donation_for_laboratory_group(api_client):
    tenant = _tenant(identifier="tn-ai-bloodbank-donation", domain="tn-ai-bloodbank-donation.local")
    user = _user(tenant, "laboratorio_ai_bloodbank", GROUPS["LABORATORIO"])
    donor = Patient.objects.create(
        tenant=tenant,
        name="Doador IA",
        birth_date=date(1980, 1, 1),
        blood_type="O+",
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                f"Crie doação de sangue doador {donor.custom_id} bolsa BLD-IA-001 "
                "tipo sanguíneo O+ estado concluida triagem pendente volume 450 peso 70 hemoglobina 13"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "bloodbank-doacao"
    assert action.payload["data"]["donor"] == donor.id
    assert action.payload["data"]["bag_identifier"] == "BLD-IA-001"
    assert action.payload["data"]["blood_type"] == "O+"
    assert action.payload["data"]["status"] == BloodDonation.DonationStatus.COMPLETED

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    donation = BloodDonation.objects.get(tenant=tenant, bag_identifier="BLD-IA-001")
    assert donation.donor_id == donor.id
    assert donation.status == BloodDonation.DonationStatus.COMPLETED
    unit = BloodUnit.objects.get(tenant=tenant, donation=donation)
    assert unit.unit_number == "BLD-IA-001-01"
    assert BloodStockMovement.objects.filter(
        tenant=tenant,
        unit=unit,
        movement_type=BloodStockMovement.MovementType.INBOUND,
    ).exists()


@pytest.mark.django_db
def test_ai_bloodbank_crud_updates_donation_by_bag_identifier(api_client):
    tenant = _tenant(identifier="tn-ai-bloodbank-update", domain="tn-ai-bloodbank-update.local")
    user = _user(tenant, "laboratorio_ai_bloodbank_update", GROUPS["LABORATORIO"])
    donor = Patient.objects.create(
        tenant=tenant,
        name="Doador Alterar",
        birth_date=date(1985, 5, 10),
        blood_type="A+",
    )
    donation = BloodDonation.objects.create(
        tenant=tenant,
        donor=donor,
        bag_identifier="BLD-UPD-001",
        blood_type="A+",
        donor_weight_kg="68.00",
        hemoglobin_g_dl="13.20",
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Altere doação de sangue código BLD-UPD-001 observações Seguimento actualizado",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_update")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "bloodbank-doacao"
    assert action.payload["object_ref"] == "BLD-UPD-001"
    assert action.payload["data"]["notes"] == "Seguimento actualizado"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    donation.refresh_from_db()
    assert donation.notes == "Seguimento actualizado"


@pytest.mark.django_db
def test_ai_bloodbank_crud_creates_transfusion_for_nursing_group(api_client):
    tenant = _tenant(identifier="tn-ai-bloodbank-transfusion", domain="tn-ai-bloodbank-transfusion.local")
    user = _user(tenant, "enfermagem_ai_bloodbank", GROUPS["ENFERMAGEM"])
    donor = Patient.objects.create(
        tenant=tenant,
        name="Doador Transfusão",
        birth_date=date(1979, 8, 20),
        blood_type="O+",
    )
    recipient = Patient.objects.create(
        tenant=tenant,
        name="Receptor Transfusão",
        birth_date=date(1990, 3, 12),
        blood_type="O+",
    )
    donation = BloodDonation.objects.create(
        tenant=tenant,
        donor=donor,
        bag_identifier="BLD-TRF-001",
        blood_type="O+",
        status=BloodDonation.DonationStatus.COMPLETED,
        donor_weight_kg="72.00",
        hemoglobin_g_dl="14.00",
    )
    unit = BloodUnit.objects.get(tenant=tenant, donation=donation)
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                f"Crie transfusão de sangue receptor {recipient.custom_id} unidade {unit.unit_number} "
                "estado solicitada indicação Anemia severa"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "bloodbank-transfusao"
    assert action.payload["data"]["recipient"] == recipient.id
    assert action.payload["data"]["blood_unit"] == unit.id
    assert action.payload["data"]["status"] == BloodTransfusion.TransfusionStatus.REQUESTED

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    transfusion = BloodTransfusion.objects.get(tenant=tenant, blood_unit=unit)
    assert transfusion.recipient_id == recipient.id
    assert transfusion.indication == "Anemia severa"


@pytest.mark.django_db
def test_ai_bloodbank_crud_creates_storage_maintenance(api_client):
    tenant = _tenant(identifier="tn-ai-bloodbank-maintenance", domain="tn-ai-bloodbank-maintenance.local")
    user = _user(tenant, "laboratorio_ai_bloodbank_maintenance", GROUPS["LABORATORIO"])
    storage = BloodStorage.objects.create(
        tenant=tenant,
        name="Banco Central IA",
        location="Bloco A",
        capacity_units=100,
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                "Crie manutenção de armazenamento armazenamento Banco Central IA tipo calibração "
                "técnico João Matias estado agendada achados Termómetro pendente"
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_create")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "bloodbank-manutencaoarmazenamento"
    assert action.payload["data"]["storage"] == storage.id
    assert action.payload["data"]["maintenance_type"] == BloodStorageMaintenance.MaintenanceType.CALIBRATION
    assert action.payload["data"]["technician_name"] == "João Matias"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    maintenance = BloodStorageMaintenance.objects.get(tenant=tenant, storage=storage)
    assert maintenance.maintenance_type == BloodStorageMaintenance.MaintenanceType.CALIBRATION
    assert maintenance.technician_name == "João Matias"
    assert maintenance.findings == "Termómetro pendente"


@pytest.mark.django_db
def test_ai_bloodbank_crud_deletes_donation_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-bloodbank-delete", domain="tn-ai-bloodbank-delete.local")
    admin = _user(tenant, "admin_ai_bloodbank_delete", GROUPS["ADMIN"], is_staff=True)
    donor = Patient.objects.create(
        tenant=tenant,
        name="Doador Removível",
        birth_date=date(1988, 2, 2),
        blood_type="B+",
    )
    donation = BloodDonation.objects.create(
        tenant=tenant,
        donor=donor,
        bag_identifier="BLD-DEL-001",
        blood_type="B+",
        donor_weight_kg="70.00",
        hemoglobin_g_dl="13.50",
    )
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Remova doação de sangue id {donation.id}",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_delete")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "bloodbank-doacao"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    removed = BloodDonation.all_objects.get(id=donation.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_bloodbank_crud_blocks_manual_storage_create(api_client):
    tenant = _tenant(identifier="tn-ai-bloodbank-storage-blocked", domain="tn-ai-bloodbank-storage-blocked.local")
    admin = _user(tenant, "admin_ai_bloodbank_storage_blocked", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie armazenamento de sangue nome Banco Novo capacidade 100",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso preparar" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not BloodStorage.objects.filter(tenant=tenant, name="Banco Novo").exists()


@pytest.mark.django_db
def test_ai_investigations_endpoint_is_user_scoped(api_client):
    tenant = _tenant(identifier="tn-ai-investigations", domain="tn-ai-investigations.local")
    owner = _user(tenant, "owner_ai_investigation", GROUPS["RECEPCAO"])
    other = _user(tenant, "other_ai_investigation", GROUPS["RECEPCAO"])
    session = AiSession.objects.create(tenant=tenant, user=owner, title="Investigação", language="pt")
    owned = AiInvestigation.objects.create(
        tenant=tenant,
        session=session,
        created_by=owner,
        title="Investigação de dados",
        question="Quantos pacientes existem?",
        intent="data_exploration",
        findings=[{"title": "Pacientes", "detail": "0"}],
        next_steps=[{"label": "Abrir pacientes", "href": "/patients"}],
        recommended_questions=["Mostre uma listagem segura."],
        tool_names=["explore_database"],
        result_summary="Investigação estruturada sobre pacientes.",
    )
    hidden = AiInvestigation.objects.create(
        tenant=tenant,
        session=session,
        created_by=other,
        title="Outra investigação",
        question="Outro",
        intent="data_exploration",
    )

    _authenticate(api_client, tenant, owner)
    response = api_client.get("/api/v1/ai/assistant/investigations/", format="json")

    assert response.status_code == 200, _response_data(response)
    rows = _response_data(response)
    assert [row["id"] for row in rows] == [owned.id]

    detail_response = api_client.get(f"/api/v1/ai/assistant/investigations/{owned.id}/", format="json")
    assert detail_response.status_code == 200, _response_data(detail_response)
    assert _response_data(detail_response)["id"] == owned.id

    hidden_response = api_client.get(f"/api/v1/ai/assistant/investigations/{hidden.id}/", format="json")
    assert hidden_response.status_code == 404

    filtered_response = api_client.get(
        "/api/v1/ai/assistant/investigations/?q=pacientes&status=ready&intent=data_exploration&tool=explore_database",
        format="json",
    )
    assert filtered_response.status_code == 200, _response_data(filtered_response)
    assert [row["id"] for row in _response_data(filtered_response)] == [owned.id]

    patch_response = api_client.patch(
        f"/api/v1/ai/assistant/investigations/{owned.id}/",
        {"status": "archived"},
        format="json",
    )
    assert patch_response.status_code == 200, _response_data(patch_response)
    owned.refresh_from_db()
    assert owned.status == AiInvestigation.Status.ARCHIVED
    assert _response_data(patch_response)["status"] == "archived"


@pytest.mark.django_db
def test_ai_investigation_followup_prepares_confirmable_actions(api_client):
    tenant = _tenant(identifier="tn-ai-investigation-followup", domain="tn-ai-investigation-followup.local")
    admin = _user(tenant, "admin_ai_investigation_followup", GROUPS["ADMIN"], is_staff=True)
    other = _user(tenant, "other_ai_investigation_followup", GROUPS["RECEPCAO"])
    session = AiSession.objects.create(tenant=tenant, user=admin, title="Investigação", language="pt")
    investigation = AiInvestigation.objects.create(
        tenant=tenant,
        session=session,
        created_by=admin,
        title="Investigação operacional",
        question="O que devo priorizar hoje?",
        intent="operational_health",
        findings=[{"title": "Erros 5xx", "detail": "3", "severity": "warning"}],
        sources=[{"type": "endpoint", "label": "Command Center", "href": "/monitoring/command-center"}],
        tool_names=["get_command_center_alerts"],
        result_summary="Há erros operacionais que exigem seguimento.",
    )

    _authenticate(api_client, tenant, admin)
    task_response = api_client.post(
        f"/api/v1/ai/assistant/investigations/{investigation.id}/follow-up/",
        {"action_type": "create_operational_task", "language": "pt"},
        format="json",
    )

    assert task_response.status_code == 201, _response_data(task_response)
    task_action_data = _response_data(task_response)
    assert task_action_data["action_type"] == "create_operational_task"
    task_action = AiSuggestedAction.objects.get(id=task_action_data["id"])
    assert task_action.status == AiSuggestedAction.Status.PENDING_CONFIRMATION
    assert task_action.payload["source_type"] == "ai_investigation"
    assert task_action.payload["metadata"]["ai_investigation_id"] == investigation.id

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{task_action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )
    assert confirm_response.status_code == 200, _response_data(confirm_response)
    task = AiOperationalTask.objects.get(action=task_action)
    assert task.source_type == "ai_investigation"
    assert task.metadata["prepared_payload"]["metadata"]["ai_investigation_id"] == investigation.id

    report_response = api_client.post(
        f"/api/v1/ai/assistant/investigations/{investigation.id}/follow-up/",
        {"action_type": "prepare_ai_report_export", "language": "pt"},
        format="json",
    )
    assert report_response.status_code == 201, _response_data(report_response)
    report_action = AiSuggestedAction.objects.get(id=_response_data(report_response)["id"])
    assert report_action.action_type == "prepare_ai_report_export"
    assert report_action.payload["ai_investigation_id"] == investigation.id
    assert report_action.payload["report_kind"] == "command_center"

    _authenticate(api_client, tenant, other)
    hidden_response = api_client.post(
        f"/api/v1/ai/assistant/investigations/{investigation.id}/follow-up/",
        {"action_type": "prepare_ai_report_export", "language": "pt"},
        format="json",
    )
    assert hidden_response.status_code == 404


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


@pytest.mark.django_db
def test_ai_report_request_prepares_confirmable_export_action(api_client):
    tenant = _tenant(identifier="tn-ai-report", domain="tn-ai-report.local")
    admin = _user(tenant, "admin_ai_report", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Gere um relatório financeiro dos últimos 30 dias",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    actions = data["suggested_actions"]
    assert any(action["action_type"] == "prepare_ai_report_export" for action in actions)
    report_action = next(action for action in actions if action["action_type"] == "prepare_ai_report_export")
    assert report_action["requires_confirmation"] is True
    assert report_action["href"] in ("", None)
    assert any(call["tool_name"] == "prepare_operational_report" for call in data["tool_calls"])

    action = AiSuggestedAction.objects.get(id=report_action["id"])
    assert action.status == AiSuggestedAction.Status.PENDING_CONFIRMATION
    assert action.payload["report_kind"] == "finance"
    assert action.payload["filters"]["days"] == "30"


@pytest.mark.django_db
def test_ai_confirm_report_action_creates_export_job(api_client):
    tenant = _tenant(identifier="tn-ai-report-confirm", domain="tn-ai-report-confirm.local")
    admin = _user(tenant, "admin_ai_report_confirm", GROUPS["ADMIN"], is_staff=True)
    session = AiSession.objects.create(tenant=tenant, user=admin, title="Relatório", language="pt")
    action = AiSuggestedAction.objects.create(
        tenant=tenant,
        session=session,
        created_by=admin,
        action_type="prepare_ai_report_export",
        payload={
            "report_kind": "finance",
            "language": "pt",
            "title_pt": "Relatório financeiro operacional - 30 dia(s)",
            "title_en": "Financial operational report - 30 day(s)",
            "filters": {"days": 30},
            "tool_summaries": [
                {
                    "tool_name": "get_financial_operational_summary",
                    "title_pt": "Resumo financeiro operacional",
                    "title_en": "Financial operational summary",
                    "metrics": [{"label_pt": "Faturas emitidas", "label_en": "Issued invoices", "value": 0}],
                }
            ],
            "sources": [{"type": "model", "label": "Invoice", "href": "/invoices"}],
            "allowed_groups": [GROUPS["ADMIN"]],
        },
        payload_redacted={},
        requires_confirmation=True,
        confirmation_summary="Gerar relatório operacional em Markdown para 30 dia(s).",
    )

    _authenticate(api_client, tenant, admin)
    response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action.refresh_from_db()
    assert action.status == AiSuggestedAction.Status.CONFIRMED
    assert data["href"].startswith("/api/v1/monitoring/export_job/")
    assert action.payload["export_job_id"]

    state = get_export_job_state(action.payload["export_job_id"])
    assert state is not None
    assert state["status"] == "ready"
    result = get_export_job_result(action.payload["export_job_id"])
    assert result is not None
    file_bytes, filename, content_type = result
    assert filename.endswith(".md")
    assert content_type.startswith("text/markdown")
    assert "Relatório financeiro operacional" in file_bytes.decode("utf-8")


@pytest.mark.django_db
def test_ai_operational_task_request_prepares_confirmable_action(api_client):
    tenant = _tenant(identifier="tn-ai-task", domain="tn-ai-task.local")
    admin = _user(tenant, "admin_ai_task", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie uma tarefa para a enfermagem investigar requisições laboratoriais pendentes",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "prepare_operational_task" for call in data["tool_calls"])
    task_action = next(action for action in data["suggested_actions"] if action["action_type"] == "create_operational_task")
    assert task_action["requires_confirmation"] is True

    action = AiSuggestedAction.objects.get(id=task_action["id"])
    assert action.status == AiSuggestedAction.Status.PENDING_CONFIRMATION
    assert action.payload["assigned_group"] == GROUPS["ENFERMAGEM"]
    assert action.payload["module_key"] == "nursing"


@pytest.mark.django_db
def test_ai_confirm_operational_task_creates_task_and_exposes_queue(api_client):
    tenant = _tenant(identifier="tn-ai-task-confirm", domain="tn-ai-task-confirm.local")
    admin = _user(tenant, "admin_ai_task_confirm", GROUPS["ADMIN"], is_staff=True)
    session = AiSession.objects.create(tenant=tenant, user=admin, title="Tarefa", language="pt")
    action = AiSuggestedAction.objects.create(
        tenant=tenant,
        session=session,
        created_by=admin,
        action_type="create_operational_task",
        payload={
            "assigned_group": GROUPS["ENFERMAGEM"],
            "module_key": "nursing",
            "priority": "high",
            "title": "Investigar pendências de enfermagem",
            "description": "Tarefa preparada pela IA.",
            "source_type": "ai_chat",
            "source_reference": "REQ-20260520-0001",
            "allowed_groups": [GROUPS["ADMIN"], GROUPS["ENFERMAGEM"]],
        },
        payload_redacted={},
        requires_confirmation=True,
        confirmation_summary="Criar tarefa operacional para Enfermeiro.",
    )

    _authenticate(api_client, tenant, admin)
    response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    task = AiOperationalTask.objects.get(action=action)
    assert task.status == AiOperationalTask.Status.OPEN
    assert task.assigned_group == GROUPS["ENFERMAGEM"]
    assert data["operational_task"]["id"] == task.id
    assert data["href"] == f"/ai/tasks/{task.id}"

    list_response = api_client.get(
        "/api/v1/ai/assistant/tasks/?status=open&priority=high&module=nursing&q=pendências",
        format="json",
    )
    assert list_response.status_code == 200, _response_data(list_response)
    assert any(item["id"] == task.id for item in _response_data(list_response))

    detail_response = api_client.get(f"/api/v1/ai/assistant/tasks/{task.id}/", format="json")
    assert detail_response.status_code == 200, _response_data(detail_response)
    assert _response_data(detail_response)["id"] == task.id

    patch_response = api_client.patch(
        f"/api/v1/ai/assistant/tasks/{task.id}/",
        {"status": "in_progress", "priority": "critical"},
        format="json",
    )
    assert patch_response.status_code == 200, _response_data(patch_response)
    task.refresh_from_db()
    assert task.status == AiOperationalTask.Status.IN_PROGRESS
    assert task.priority == AiOperationalTask.Priority.CRITICAL
    assert task.metadata["lifecycle_history"][-1]["to_status"] == "in_progress"


@pytest.mark.django_db
def test_ai_confirm_operational_task_revalidates_assigned_group(api_client):
    tenant = _tenant(identifier="tn-ai-task-denied", domain="tn-ai-task-denied.local")
    recepcao = _user(tenant, "recepcao_ai_task_denied", GROUPS["RECEPCAO"])
    session = AiSession.objects.create(tenant=tenant, user=recepcao, title="Tarefa", language="pt")
    action = AiSuggestedAction.objects.create(
        tenant=tenant,
        session=session,
        created_by=recepcao,
        action_type="create_operational_task",
        payload={
            "assigned_group": GROUPS["ENFERMAGEM"],
            "module_key": "nursing",
            "priority": "normal",
            "title": "Investigar pendências de enfermagem",
            "description": "Tarefa preparada pela IA.",
            "allowed_groups": [GROUPS["RECEPCAO"], GROUPS["ENFERMAGEM"]],
        },
        payload_redacted={},
        requires_confirmation=True,
        confirmation_summary="Criar tarefa operacional para Enfermeiro.",
    )

    _authenticate(api_client, tenant, recepcao)
    response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert response.status_code == 403, _response_data(response)
    assert not AiOperationalTask.objects.filter(action=action).exists()


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

    personal_names = {tool.name for tool in registry.select_tools(message="quem sou eu neste sistema", active_module="ai")}
    data_names = {tool.name for tool in registry.select_tools(message="quantos pacientes existem", active_module="ai")}
    clinical_names = {tool.name for tool in registry.select_tools(message="mostra frasco e amostra da REQ-20260520-0001", active_module="ai")}
    finance_names = {tool.name for tool in registry.select_tools(message="resumo financeiro de faturas e pagamentos", active_module="ai")}
    report_names = {tool.name for tool in registry.select_tools(message="relatório financeiro dos últimos 30 dias", active_module="ai")}
    task_names = {tool.name for tool in registry.select_tools(message="criar tarefa para enfermagem investigar pendências", active_module="ai")}
    education_names = {tool.name for tool in registry.select_tools(message="resumo de estudantes e matrículas", active_module="ai")}

    assert "get_user_context" in personal_names
    assert "explore_database" in data_names
    assert "get_lab_request_collection_guidance" in clinical_names
    assert "get_financial_operational_summary" in finance_names
    assert "prepare_operational_report" in report_names
    assert "prepare_operational_task" in task_names
    assert "get_education_summary" in education_names
