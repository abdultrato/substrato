from datetime import date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
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
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.education.models import (
    AttendanceRecord,
    Classroom,
    Course,
    Enrollment,
    Examination,
    GradeRecord,
    LearningContent,
    StudentProfile,
    TeacherProfile,
)
from apps.equipment.models.equipment import Equipment
from apps.equipment_integrations.models import (
    IntegrationAnalyteMapping,
    IntegrationCredential,
    IntegrationDocument,
    IntegrationEquipment,
    IntegrationMessage,
    IntegrationOrder,
    IntegrationOrderItem,
    IntegrationRouting,
)
from apps.external_entities.models.company import Company
from apps.incidents.models.incident import Incident
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maintenance.models.maintenance import Maintenance
from apps.monitoring.models import SystemError, TransactionalOutboxEvent
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit
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


def _prepare_ai_crud_action(api_client, message: str, action_type: str = "ai_crud_create"):
    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": message, "language": "pt", "active_module": "ai"},
        format="json",
    )
    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    matching_actions = [action for action in data["suggested_actions"] if action["action_type"] == action_type]
    assert matching_actions, data
    action_payload = matching_actions[0]
    return data, AiSuggestedAction.objects.get(id=action_payload["id"])


def _confirm_ai_action(api_client, action: AiSuggestedAction):
    response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )
    assert response.status_code == 200, _response_data(response)
    action.refresh_from_db()
    return _response_data(response)


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
def test_ai_consultations_crud_creates_specialty_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-consultations-specialty", domain="tn-ai-consultations-specialty.local")
    admin = _user(tenant, "admin_ai_consultations_specialty", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                "Crie especialidade de consulta nome Dermatologia descrição Consulta de pele "
                "preço base 700 iva 16 ativo sim"
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
    assert action.payload["basename"] == "consultations-specialty"
    assert action.payload["data"]["name"] == "Dermatologia"
    assert action.payload["data"]["base_price"] == "700"
    assert action.payload["data"]["vat_percentage"] == "16"
    assert action.payload["data"]["active"] is True

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    specialty = ConsultationSpecialty.objects.get(tenant=tenant, name__iexact="Dermatologia")
    assert str(specialty.base_price) == "700.00"
    assert str(specialty.vat_percentage) == "16.00"


@pytest.mark.django_db
def test_ai_consultations_crud_creates_consultation_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-consultations-create", domain="tn-ai-consultations-create.local")
    user = _user(tenant, "recepcao_ai_consultations_create", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Consulta IA")
    specialty = ConsultationSpecialty.objects.create(
        tenant=tenant,
        name="Clínica Geral",
        base_price="500.00",
        vat_percentage="16.00",
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                f"Crie consulta médica paciente {patient.custom_id} especialidade {specialty.custom_id} "
                "agendada para 2026-06-15T10:00:00+02:00 descrição Primeira avaliação"
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
    assert action.payload["basename"] == "consultations-consultation"
    assert action.payload["data"]["patient"] == patient.id
    assert action.payload["data"]["specialty"] == specialty.id
    assert action.payload["data"]["scheduled_for"] == "2026-06-15T10:00:00+02:00"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    consultation = MedicalConsultation.objects.get(tenant=tenant, patient=patient)
    assert consultation.specialty_id == specialty.id
    assert consultation.type == specialty.name
    assert str(consultation.price) == "500.00"
    assert consultation.status == MedicalConsultation.Status.SCHEDULED


@pytest.mark.django_db
def test_ai_consultations_crud_updates_consultation_by_code(api_client):
    tenant = _tenant(identifier="tn-ai-consultations-update", domain="tn-ai-consultations-update.local")
    user = _user(tenant, "recepcao_ai_consultations_update", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Consulta Alterar")
    specialty = ConsultationSpecialty.objects.create(
        tenant=tenant,
        name="Medicina Interna",
        base_price="600.00",
        vat_percentage="16.00",
    )
    consultation = MedicalConsultation.objects.create(
        tenant=tenant,
        patient=patient,
        specialty=specialty,
        scheduled_for=timezone.make_aware(datetime(2026, 6, 15, 10, 0, 0)),
        description="Original",
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Altere consulta código {consultation.custom_id} descrição Seguimento ajustado feriado manual sim",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_update")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "consultations-consultation"
    assert action.payload["object_ref"] == consultation.custom_id
    assert action.payload["data"]["description"] == "Seguimento ajustado"
    assert action.payload["data"]["manual_holiday"] is True

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    consultation.refresh_from_db()
    assert consultation.description == "Seguimento ajustado"
    assert consultation.manual_holiday is True
    assert consultation.schedule_type == MedicalConsultation.ScheduleType.MANUAL_HOLIDAY
    assert str(consultation.price) == "1200.00"


@pytest.mark.django_db
def test_ai_consultations_crud_deletes_holiday_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-consultations-holiday", domain="tn-ai-consultations-holiday.local")
    admin = _user(tenant, "admin_ai_consultations_holiday", GROUPS["ADMIN"], is_staff=True)
    holiday = Holiday.objects.create(
        tenant=tenant,
        date="2026-12-25",
        description="Natal institucional",
        active=True,
    )
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Remova feriado de consulta id {holiday.id}",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    action_payload = next(action for action in data["suggested_actions"] if action["action_type"] == "ai_crud_delete")
    action = AiSuggestedAction.objects.get(id=action_payload["id"])
    assert action.payload["basename"] == "consultations-holiday"

    confirm_response = api_client.post(
        f"/api/v1/ai/assistant/actions/{action.id}/confirm/",
        {"confirmation_text": "Confirmo"},
        format="json",
    )

    assert confirm_response.status_code == 200, _response_data(confirm_response)
    removed = Holiday.all_objects.get(id=holiday.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_consultations_crud_denies_specialty_write_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-consultations-denied", domain="tn-ai-consultations-denied.local")
    user = _user(tenant, "recepcao_ai_consultations_denied", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie especialidade de consulta nome Restrita preço base 100",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not ConsultationSpecialty.objects.filter(tenant=tenant, name__iexact="Restrita").exists()


@pytest.mark.django_db
def test_ai_education_crud_creates_course_for_school_director(api_client):
    tenant = _tenant(identifier="tn-ai-education-course", domain="tn-ai-education-course.local")
    director = _user(tenant, "director_ai_education_course", GROUPS["DIRETOR_ESCOLA"])
    _authenticate(api_client, tenant, director)

    _data, action = _prepare_ai_crud_action(
        api_client,
        "Crie curso nome Matemática Aplicada código MAT-IA carga horária 80 estado ativo descrição Curso anual",
    )

    assert action.payload["basename"] == "education-course"
    assert action.payload["data"]["name"] == "Matemática Aplicada"
    assert action.payload["data"]["code"] == "MAT-IA"
    assert action.payload["data"]["workload_hours"] == 80
    assert action.payload["data"]["status"] == Course.Status.ACTIVE

    _confirm_ai_action(api_client, action)
    course = Course.objects.get(tenant=tenant, code="MAT-IA")
    assert course.name == "Matemática Aplicada"
    assert course.workload_hours == 80
    assert course.status == Course.Status.ACTIVE


@pytest.mark.django_db
def test_ai_education_crud_creates_student_and_teacher_profiles(api_client):
    tenant = _tenant(identifier="tn-ai-education-profiles", domain="tn-ai-education-profiles.local")
    director = _user(tenant, "director_ai_education_profiles", GROUPS["DIRETOR_ESCOLA"])
    student_user = _user(tenant, "student_ai_profile", GROUPS["ESTUDANTE"])
    teacher_user = _user(tenant, "teacher_ai_profile", GROUPS["PROFESSOR"])
    _authenticate(api_client, tenant, director)

    _data, student_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie estudante utilizador {student_user.username} código EST-IA-001 "
            "data nascimento 2010-05-10 encarregado Maria Cuinica estado ativo observações Bolsista"
        ),
    )
    _data, teacher_action = _prepare_ai_crud_action(
        api_client,
        f"Crie professor utilizador {teacher_user.username} código PROF-IA-001 especialidade Matemática estado ativo",
    )

    assert student_action.payload["basename"] == "education-student"
    assert student_action.payload["data"]["user"] == student_user.id
    assert student_action.payload["data"]["student_code"] == "EST-IA-001"
    assert teacher_action.payload["basename"] == "education-teacher"
    assert teacher_action.payload["data"]["user"] == teacher_user.id
    assert teacher_action.payload["data"]["teacher_code"] == "PROF-IA-001"

    _confirm_ai_action(api_client, student_action)
    _confirm_ai_action(api_client, teacher_action)
    assert StudentProfile.objects.filter(tenant=tenant, user=student_user, student_code="EST-IA-001").exists()
    assert TeacherProfile.objects.filter(tenant=tenant, user=teacher_user, teacher_code="PROF-IA-001").exists()


@pytest.mark.django_db
def test_ai_education_crud_creates_classroom_enrollment_and_attendance(api_client):
    tenant = _tenant(identifier="tn-ai-education-flow", domain="tn-ai-education-flow.local")
    director = _user(tenant, "director_ai_education_flow", GROUPS["DIRETOR_ESCOLA"])
    student_user = _user(tenant, "student_ai_flow", GROUPS["ESTUDANTE"])
    teacher_user = _user(tenant, "teacher_ai_flow", GROUPS["PROFESSOR"])
    course = Course.objects.create(tenant=tenant, name="Ciências Naturais", code="CIE-IA", workload_hours=90)
    student = StudentProfile.objects.create(tenant=tenant, user=student_user, student_code="EST-FLOW-001")
    teacher = TeacherProfile.objects.create(tenant=tenant, user=teacher_user, teacher_code="PROF-FLOW-001")
    _authenticate(api_client, tenant, director)

    _data, classroom_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie turma nome 8A curso {course.code} professor titular {teacher.teacher_code} "
            "ano letivo 2026 capacidade 35"
        ),
    )
    assert classroom_action.payload["basename"] == "education-classroom"
    assert classroom_action.payload["data"]["course"] == course.id
    assert classroom_action.payload["data"]["homeroom_teacher"] == teacher.id
    _confirm_ai_action(api_client, classroom_action)
    classroom = Classroom.objects.get(tenant=tenant, name="8A")

    _data, enrollment_action = _prepare_ai_crud_action(
        api_client,
        f"Crie matrícula estudante {student.student_code} turma {classroom.custom_id} estado ativo matriculado em 2026-02-01",
    )
    assert enrollment_action.payload["basename"] == "education-enrollment"
    assert enrollment_action.payload["data"]["student"] == student.id
    assert enrollment_action.payload["data"]["classroom"] == classroom.id
    assert enrollment_action.payload["data"]["status"] == Enrollment.Status.ACTIVE
    _confirm_ai_action(api_client, enrollment_action)
    enrollment = Enrollment.objects.get(tenant=tenant, student=student, classroom=classroom)

    _data, attendance_action = _prepare_ai_crud_action(
        api_client,
        f"Crie presença matrícula {enrollment.custom_id} data 2026-02-02 estado presente observações Aula inaugural",
    )
    assert attendance_action.payload["basename"] == "education-attendance"
    assert attendance_action.payload["data"]["enrollment"] == enrollment.id
    assert attendance_action.payload["data"]["status"] == AttendanceRecord.Status.PRESENT
    _confirm_ai_action(api_client, attendance_action)
    attendance = AttendanceRecord.objects.get(tenant=tenant, enrollment=enrollment, attendance_date="2026-02-02")
    assert attendance.notes == "Aula inaugural"


@pytest.mark.django_db
def test_ai_education_crud_creates_grade_examination_and_content(api_client):
    tenant = _tenant(identifier="tn-ai-education-academic", domain="tn-ai-education-academic.local")
    director = _user(tenant, "director_ai_education_academic", GROUPS["DIRETOR_ESCOLA"])
    student_user = _user(tenant, "student_ai_academic", GROUPS["ESTUDANTE"])
    teacher_user = _user(tenant, "teacher_ai_academic", GROUPS["PROFESSOR"])
    course = Course.objects.create(tenant=tenant, name="História", code="HIS-IA", workload_hours=60)
    student = StudentProfile.objects.create(tenant=tenant, user=student_user, student_code="EST-ACA-001")
    teacher = TeacherProfile.objects.create(tenant=tenant, user=teacher_user, teacher_code="PROF-ACA-001")
    classroom = Classroom.objects.create(tenant=tenant, name="9B", course=course, homeroom_teacher=teacher, academic_year="2026")
    enrollment = Enrollment.objects.create(tenant=tenant, student=student, classroom=classroom, status=Enrollment.Status.ACTIVE)
    _authenticate(api_client, tenant, director)

    _data, grade_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie avaliação matrícula {enrollment.custom_id} professor {teacher.teacher_code} "
            "componente Teste 1 nota 17 nota máxima 20 peso 1"
        ),
    )
    assert grade_action.payload["basename"] == "education-grade"
    assert grade_action.payload["data"]["enrollment"] == enrollment.id
    assert grade_action.payload["data"]["teacher"] == teacher.id
    assert grade_action.payload["data"]["score"] == "17"
    _confirm_ai_action(api_client, grade_action)
    grade = GradeRecord.objects.get(tenant=tenant, enrollment=enrollment, component="Teste 1")
    assert str(grade.score) == "17.00"

    _data, exam_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie exame escolar título Exame Trimestral curso {course.code} turma {classroom.custom_id} "
            "agendado para 2026-03-20T08:00:00+02:00 nota máxima 20"
        ),
    )
    assert exam_action.payload["basename"] == "education-examination"
    assert exam_action.payload["data"]["course"] == course.id
    assert exam_action.payload["data"]["classroom"] == classroom.id
    _confirm_ai_action(api_client, exam_action)
    assert Examination.objects.filter(tenant=tenant, course=course, title="Exame Trimestral").exists()

    _data, content_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie conteúdo título Revolução Industrial curso {course.code} professor {teacher.teacher_code} "
            "tipo aula texto Material introdutório publicado sim"
        ),
    )
    assert content_action.payload["basename"] == "education-content"
    assert content_action.payload["data"]["course"] == course.id
    assert content_action.payload["data"]["author"] == teacher.id
    assert content_action.payload["data"]["content_type"] == LearningContent.ContentType.LESSON
    assert content_action.payload["data"]["published"] is True
    _confirm_ai_action(api_client, content_action)
    content = LearningContent.objects.get(tenant=tenant, course=course, title="Revolução Industrial")
    assert content.published is True


@pytest.mark.django_db
def test_ai_education_crud_updates_course_and_denies_student_write(api_client):
    tenant = _tenant(identifier="tn-ai-education-update-denied", domain="tn-ai-education-update-denied.local")
    director = _user(tenant, "director_ai_education_update", GROUPS["DIRETOR_ESCOLA"])
    student_user = _user(tenant, "student_ai_education_denied", GROUPS["ESTUDANTE"])
    course = Course.objects.create(tenant=tenant, name="Geografia", code="GEO-IA", workload_hours=40)
    _authenticate(api_client, tenant, director)

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        "Altere curso código GEO-IA nome Geografia Aplicada carga horária 55 estado arquivado",
        action_type="ai_crud_update",
    )
    assert update_action.payload["basename"] == "education-course"
    assert update_action.payload["object_ref"] == "GEO-IA"
    assert update_action.payload["data"]["status"] == Course.Status.ARCHIVED
    _confirm_ai_action(api_client, update_action)
    course.refresh_from_db()
    assert course.name == "Geografia Aplicada"
    assert course.workload_hours == 55
    assert course.status == Course.Status.ARCHIVED

    _authenticate(api_client, tenant, student_user)
    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie curso nome Curso Bloqueado código BLQ-IA",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not Course.objects.filter(tenant=tenant, code="BLQ-IA").exists()


@pytest.mark.django_db
def test_ai_equipment_crud_creates_equipment_for_laboratory_group(api_client):
    tenant = _tenant(identifier="tn-ai-equipment-create", domain="tn-ai-equipment-create.local")
    user = _user(tenant, "laboratorio_ai_equipment_create", GROUPS["LABORATORIO"])
    _authenticate(api_client, tenant, user)

    _data, action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie equipamento nome Centrifuga X serial EQ-IA-001 estado aquisição novo "
            "estado operacional funcionando fabricante Biobase modelo BKC local Laboratório "
            "responsável Ana ativo sim"
        ),
    )

    assert action.payload["basename"] == "equipment-equipment"
    assert action.payload["data"]["name"] == "Centrifuga X"
    assert action.payload["data"]["serial_number"] == "EQ-IA-001"
    assert action.payload["data"]["acquisition_status"] == Equipment.AcquisitionStatus.NEW
    assert action.payload["data"]["initial_operational_status"] == Equipment.OperationalStatus.WORKING
    assert action.payload["data"]["active"] is True

    _confirm_ai_action(api_client, action)
    equipment = Equipment.objects.get(tenant=tenant, serial_number="EQ-IA-001")
    assert equipment.name == "Centrifuga X"
    assert equipment.manufacturer == "Biobase"
    assert equipment.location == "Laboratório"


@pytest.mark.django_db
def test_ai_equipment_crud_creates_inspection_maintenance_and_incident(api_client):
    tenant = _tenant(identifier="tn-ai-equipment-flow", domain="tn-ai-equipment-flow.local")
    user = _user(tenant, "laboratorio_ai_equipment_flow", GROUPS["LABORATORIO"])
    equipment = Equipment.objects.create(
        tenant=tenant,
        name="Analisador Hematológico",
        serial_number="EQ-FLOW-001",
        manufacturer="Mindray",
    )
    _authenticate(api_client, tenant, user)

    _data, inspection_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie inspeção diária equipamento {equipment.serial_number} data 2026-05-01 "
            "funcionamento avariado limpeza sim avaliação Ruido anormal observações Retirar de uso"
        ),
    )
    assert inspection_action.payload["basename"] == "equipment-daily_inspection"
    assert inspection_action.payload["data"]["equipment"] == equipment.id
    assert inspection_action.payload["data"]["operation_status"] == DailyInspection.Funcionamento.AVARIADO
    assert inspection_action.payload["data"]["cleaning_performed"] is True
    _confirm_ai_action(api_client, inspection_action)
    inspection = DailyInspection.objects.get(tenant=tenant, equipment=equipment, date="2026-05-01")
    assert inspection.assessment == "Ruido anormal"

    _data, maintenance_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie manutenção equipamento {equipment.serial_number} tipo mensal "
            "agendada para 2026-05-03 realizada em 2026-05-04 descrição Substituição preventiva técnico João"
        ),
    )
    assert maintenance_action.payload["basename"] == "equipment-maintenance"
    assert maintenance_action.payload["data"]["equipment"] == equipment.id
    assert maintenance_action.payload["data"]["type"] == Maintenance.Type.MONTHLY
    _confirm_ai_action(api_client, maintenance_action)
    maintenance = Maintenance.objects.get(tenant=tenant, equipment=equipment, scheduled_date="2026-05-03")
    assert maintenance.performed_date.isoformat() == "2026-05-04"
    assert maintenance.technician == "João"

    _data, incident_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie ocorrência equipamento {equipment.serial_number} data 2026-05-02T09:00:00+02:00 "
            "tipo avaria descrição Motor aquece contacto suporte 841112222 resolvido não"
        ),
    )
    assert incident_action.payload["basename"] == "equipment-incident"
    assert incident_action.payload["data"]["equipment"] == equipment.id
    assert incident_action.payload["data"]["type"] == Incident.Type.BREAKDOWN
    assert incident_action.payload["data"]["resolved"] is False
    _confirm_ai_action(api_client, incident_action)
    incident = Incident.objects.get(tenant=tenant, equipment=equipment, support_contact="841112222")
    assert incident.description == "Motor aquece"


@pytest.mark.django_db
def test_ai_equipment_crud_updates_equipment_by_serial_number(api_client):
    tenant = _tenant(identifier="tn-ai-equipment-update", domain="tn-ai-equipment-update.local")
    user = _user(tenant, "laboratorio_ai_equipment_update", GROUPS["LABORATORIO"])
    equipment = Equipment.objects.create(
        tenant=tenant,
        name="Microscópio",
        serial_number="EQ-UPD-001",
        initial_operational_status=Equipment.OperationalStatus.WORKING,
        active=True,
    )
    _authenticate(api_client, tenant, user)

    _data, action = _prepare_ai_crud_action(
        api_client,
        (
            "Altere equipamento código EQ-UPD-001 localização Sala B responsável Marta "
            "estado operacional desligado ativo não"
        ),
        action_type="ai_crud_update",
    )

    assert action.payload["basename"] == "equipment-equipment"
    assert action.payload["object_ref"] == "EQ-UPD-001"
    assert action.payload["data"]["location"] == "Sala B"
    assert action.payload["data"]["responsible"] == "Marta"
    assert action.payload["data"]["initial_operational_status"] == Equipment.OperationalStatus.OFFLINE
    assert action.payload["data"]["active"] is False

    _confirm_ai_action(api_client, action)
    equipment.refresh_from_db()
    assert equipment.location == "Sala B"
    assert equipment.responsible == "Marta"
    assert equipment.initial_operational_status == Equipment.OperationalStatus.OFFLINE
    assert equipment.active is False


@pytest.mark.django_db
def test_ai_equipment_crud_deletes_incident_for_laboratory_group(api_client):
    tenant = _tenant(identifier="tn-ai-equipment-delete", domain="tn-ai-equipment-delete.local")
    user = _user(tenant, "laboratorio_ai_equipment_delete", GROUPS["LABORATORIO"])
    equipment = Equipment.objects.create(tenant=tenant, name="Autoclave", serial_number="EQ-DEL-001")
    incident = Incident.objects.create(
        tenant=tenant,
        equipment=equipment,
        type=Incident.Type.INCIDENT,
        description="Teste removível",
    )
    _authenticate(api_client, tenant, user)

    _data, action = _prepare_ai_crud_action(
        api_client,
        f"Remova ocorrência de equipamento id {incident.id}",
        action_type="ai_crud_delete",
    )

    assert action.payload["basename"] == "equipment-incident"
    _confirm_ai_action(api_client, action)
    removed = Incident.all_objects.get(id=incident.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_equipment_crud_denies_write_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-equipment-denied", domain="tn-ai-equipment-denied.local")
    user = _user(tenant, "recepcao_ai_equipment_denied", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie equipamento nome Bloqueado serial EQ-BLQ-001",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not Equipment.objects.filter(tenant=tenant, serial_number="EQ-BLQ-001").exists()


@pytest.mark.django_db
def test_ai_equipment_integrations_crud_creates_equipment_and_credential(api_client):
    tenant = _tenant(identifier="tn-ai-equipment-integrations-create", domain="tn-ai-equipment-integrations-create.local")
    user = _user(tenant, "laboratorio_ai_equipment_integrations_create", GROUPS["LABORATORIO"])
    _authenticate(api_client, tenant, user)

    _data, equipment_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie equipamento integrado nome GeneXpert AI serial INT-IA-001 modalidade hemograma "
            "protocolo HTTP_JSON fabricante Cepheid modelo GX ativo sim"
        ),
    )

    assert equipment_action.payload["basename"] == "equipment_integrations-equipment"
    assert equipment_action.payload["data"]["name"] == "GeneXpert AI"
    assert equipment_action.payload["data"]["serial_number"] == "INT-IA-001"
    assert equipment_action.payload["data"]["modality"] == IntegrationEquipment.Modalidade.HEMOGRAMA
    assert equipment_action.payload["data"]["protocol"] == IntegrationEquipment.Protocolo.HTTP_JSON
    _confirm_ai_action(api_client, equipment_action)

    equipment = IntegrationEquipment.objects.get(tenant=tenant, serial_number="INT-IA-001")
    assert equipment.manufacturer == "Cepheid"
    assert equipment.active is True

    _data, credential_action = _prepare_ai_crud_action(
        api_client,
        "Crie credencial de integração equipamento INT-IA-001 rótulo Chave principal",
    )

    assert credential_action.payload["basename"] == "equipment_integrations-credential"
    assert credential_action.payload["data"]["equipment"] == equipment.id
    assert credential_action.payload["data"]["label"] == "Chave principal"
    _confirm_ai_action(api_client, credential_action)

    credential = IntegrationCredential.objects.get(tenant=tenant, equipment=equipment, label="Chave principal")
    assert credential.key_prefix.startswith("int_")
    assert credential.key_last4
    assert credential.has_scope(IntegrationCredential.Scope.WORKLIST_READ)
    assert credential.has_scope(IntegrationCredential.Scope.RESULT_WRITE)


@pytest.mark.django_db
def test_ai_equipment_integrations_crud_creates_operational_resources(api_client):
    tenant = _tenant(identifier="tn-ai-equipment-integrations-flow", domain="tn-ai-equipment-integrations-flow.local")
    user = _user(tenant, "laboratorio_ai_equipment_integrations_flow", GROUPS["LABORATORIO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Integração")
    sample = Sample.objects.create(
        tenant=tenant,
        name="Sangue total IA",
        bottle_type=Sample.BottleType.EDTA_TUBE,
    )
    exam = LabExam.objects.create(
        tenant=tenant,
        name="Hemograma IA",
        price=Decimal("30.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        sample_type=sample,
    )
    exam_field = LabExamField.objects.create(
        tenant=tenant,
        exam=exam,
        name="Hemoglobina IA",
        type=ResultType.NUMERICO,
        unit=DefaultUnit.G_DL,
    )
    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    request_item = LabRequestItem.objects.create(tenant=tenant, request=request, exam=exam)
    equipment = IntegrationEquipment.objects.create(
        tenant=tenant,
        name="Analyzer Flow",
        serial_number="INT-FLOW-001",
        modality=IntegrationEquipment.Modalidade.HEMOGRAMA,
        protocol=IntegrationEquipment.Protocolo.HTTP_JSON,
    )
    _authenticate(api_client, tenant, user)

    _data, routing_action = _prepare_ai_crud_action(
        api_client,
        "Crie roteamento de integração equipamento INT-FLOW-001 tipo exame LAB setor HEMATOLOGIA ativo sim",
    )
    assert routing_action.payload["basename"] == "equipment_integrations-routing"
    assert routing_action.payload["data"]["equipment"] == equipment.id
    assert routing_action.payload["data"]["exam_type"] == IntegrationRouting.ExamType.LABORATORIO
    assert routing_action.payload["data"]["sector"] == Sector.HEMATOLOGIA
    _confirm_ai_action(api_client, routing_action)
    assert IntegrationRouting.objects.filter(tenant=tenant, equipment=equipment, sector=Sector.HEMATOLOGIA).exists()

    _data, mapping_action = _prepare_ai_crud_action(
        api_client,
        "Crie mapeamento de analito equipamento INT-FLOW-001 código HB campo de exame Hemoglobina IA unidade g/dL ativo sim",
    )
    assert mapping_action.payload["basename"] == "equipment_integrations-analyte_mapping"
    assert mapping_action.payload["data"]["equipment"] == equipment.id
    assert mapping_action.payload["data"]["exam_field"] == exam_field.id
    _confirm_ai_action(api_client, mapping_action)
    assert IntegrationAnalyteMapping.objects.filter(tenant=tenant, equipment=equipment, code="HB").exists()

    _data, order_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie ordem de integração "
            f'{{"equipment": "INT-FLOW-001", "request": "{request.custom_id}", '
            f'"status": "PEND", "observation": "Ordem via IA"}}'
        ),
    )
    assert order_action.payload["basename"] == "equipment_integrations-order"
    assert order_action.payload["data"]["equipment"] == equipment.id
    assert order_action.payload["data"]["request"] == request.id
    _confirm_ai_action(api_client, order_action)
    order = IntegrationOrder.objects.get(tenant=tenant, equipment=equipment, request=request)
    assert order.observation == "Ordem via IA"

    _data, item_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie item de ordem de integração "
            f'{{"order": "{order.custom_id}", "request_item": {request_item.id}, "status": "PEND"}}'
        ),
    )
    assert item_action.payload["basename"] == "equipment_integrations-order_item"
    assert item_action.payload["data"]["order"] == order.id
    assert item_action.payload["data"]["request_item"] == request_item.id
    _confirm_ai_action(api_client, item_action)
    order_item = IntegrationOrderItem.objects.get(tenant=tenant, order=order, request_item=request_item)
    assert order_item.status == IntegrationOrderItem.Status.PENDING

    _data, message_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie mensagem de integração equipamento INT-FLOW-001 ordem {order.custom_id} "
            "direção entrada protocolo HTTP_JSON message_id MSG-AI-001 "
            "tipo conteúdo application/json estado recebida"
        ),
    )
    assert message_action.payload["basename"] == "equipment_integrations-message"
    assert message_action.payload["data"]["equipment"] == equipment.id
    assert message_action.payload["data"]["order"] == order.id
    assert message_action.payload["data"]["direction"] == IntegrationMessage.Direction.INBOUND
    assert message_action.payload["data"]["status"] == IntegrationMessage.Status.RECEIVED
    _confirm_ai_action(api_client, message_action)
    message = IntegrationMessage.objects.get(tenant=tenant, equipment=equipment, message_id="MSG-AI-001")
    assert message.content_type == "application/json"

    _data, document_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie documento de integração "
            '{"message": "MSG-AI-001", "filename": "resultado-ai.pdf", '
            '"content_type": "application/pdf", "sha256": "abc123"}'
        ),
    )
    assert document_action.payload["basename"] == "equipment_integrations-document"
    assert document_action.payload["data"]["message"] == message.id
    assert document_action.payload["data"]["filename"] == "resultado-ai.pdf"
    _confirm_ai_action(api_client, document_action)
    assert IntegrationDocument.objects.filter(tenant=tenant, message=message, filename="resultado-ai.pdf").exists()


@pytest.mark.django_db
def test_ai_equipment_integrations_crud_updates_deletes_and_denies_write(api_client):
    tenant = _tenant(identifier="tn-ai-equipment-integrations-update", domain="tn-ai-equipment-integrations-update.local")
    user = _user(tenant, "laboratorio_ai_equipment_integrations_update", GROUPS["LABORATORIO"])
    denied_user = _user(tenant, "recepcao_ai_equipment_integrations_denied", GROUPS["RECEPCAO"])
    equipment = IntegrationEquipment.objects.create(
        tenant=tenant,
        name="Analyzer Legacy",
        serial_number="INT-UPD-001",
        protocol=IntegrationEquipment.Protocolo.HTTP_JSON,
        active=True,
    )
    message = IntegrationMessage.objects.create(
        tenant=tenant,
        equipment=equipment,
        message_id="MSG-DEL-001",
        protocol=IntegrationEquipment.Protocolo.HTTP_JSON,
    )
    _authenticate(api_client, tenant, user)

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        "Altere equipamento integrado código INT-UPD-001 nome Analyzer HL7 protocolo HL7_MLLP ativo não",
        action_type="ai_crud_update",
    )
    assert update_action.payload["basename"] == "equipment_integrations-equipment"
    assert update_action.payload["object_ref"] == "INT-UPD-001"
    assert update_action.payload["data"]["name"] == "Analyzer HL7"
    assert update_action.payload["data"]["protocol"] == IntegrationEquipment.Protocolo.HL7_MLLP
    assert update_action.payload["data"]["active"] is False
    _confirm_ai_action(api_client, update_action)
    equipment.refresh_from_db()
    assert equipment.name == "Analyzer Hl7"
    assert equipment.protocol == IntegrationEquipment.Protocolo.HL7_MLLP
    assert equipment.active is False

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova mensagem de integração id {message.id}",
        action_type="ai_crud_delete",
    )
    assert delete_action.payload["basename"] == "equipment_integrations-message"
    _confirm_ai_action(api_client, delete_action)
    removed = IntegrationMessage.all_objects.get(id=message.id)
    assert removed.deleted is True

    _authenticate(api_client, tenant, denied_user)
    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie equipamento integrado nome Bloqueado serial INT-BLQ-001",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not IntegrationEquipment.objects.filter(tenant=tenant, serial_number="INT-BLQ-001").exists()


@pytest.mark.django_db
def test_ai_external_entities_crud_creates_updates_and_deletes_company(api_client):
    tenant = _tenant(identifier="tn-ai-external-entities-crud", domain="tn-ai-external-entities-crud.local")
    user = _user(tenant, "recepcao_ai_external_entities_crud", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie empresa nome Empresa Alfa Saúde NUIT 123456789 sede Avenida Eduardo Mondlane "
            "contactos Marta Silva email alfa@example.com telefone principal +258 84 111 2222 "
            "conta bancária 000123456 observações Contrato ocupacional ativo sim"
        ),
    )

    assert create_action.payload["basename"] == "external_entities-empresa"
    assert create_action.payload["data"]["name"] == "Alfa Saúde"
    assert create_action.payload["data"]["nuit"] == "123456789"
    assert create_action.payload["data"]["headquarters_address"] == "Avenida Eduardo Mondlane"
    assert create_action.payload["data"]["contacts"] == "Marta Silva"
    assert create_action.payload["data"]["phone1"] == "+258 84 111 2222"
    assert create_action.payload["data"]["active"] is True
    _confirm_ai_action(api_client, create_action)

    company = Company.objects.get(tenant=tenant, nuit="123456789")
    assert company.name == "Alfa Saúde"
    assert company.email == "alfa@example.com"
    assert company.nib == "000123456"

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        "Altere empresa NUIT 123456789 nome Empresa Alfa Renovada telefone principal +258 84 999 0000 ativo não",
        action_type="ai_crud_update",
    )
    assert update_action.payload["basename"] == "external_entities-empresa"
    assert update_action.payload["object_ref"] == "123456789"
    assert update_action.payload["data"]["name"] == "Alfa Renovada"
    assert update_action.payload["data"]["phone1"] == "+258 84 999 0000"
    assert update_action.payload["data"]["active"] is False
    _confirm_ai_action(api_client, update_action)

    company.refresh_from_db()
    assert company.name == "Alfa Renovada"
    assert company.phone1 == "+258 84 999 0000"
    assert company.active is False

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        "Remova empresa NUIT 123456789",
        action_type="ai_crud_delete",
    )
    assert delete_action.payload["basename"] == "external_entities-empresa"
    _confirm_ai_action(api_client, delete_action)
    removed = Company.all_objects.get(id=company.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_external_entities_crud_allows_occupational_medicine_and_denies_laboratory(api_client):
    tenant = _tenant(identifier="tn-ai-external-entities-access", domain="tn-ai-external-entities-access.local")
    occupational = _user(tenant, "medicina_ocupacional_ai_external_entities", GROUPS["MEDICINA_OCUPACIONAL"])
    laboratory = _user(tenant, "laboratorio_ai_external_entities_denied", GROUPS["LABORATORIO"])

    _authenticate(api_client, tenant, occupational)
    _data, action = _prepare_ai_crud_action(
        api_client,
        "Crie entidade externa nome Clínica Parceira NUIT 987654321 contacto João ativo sim",
    )
    assert action.payload["basename"] == "external_entities-empresa"
    assert action.payload["data"]["name"] == "Clínica Parceira"
    assert action.payload["data"]["contacts"] == "João"
    _confirm_ai_action(api_client, action)
    assert Company.objects.filter(tenant=tenant, nuit="987654321", name="Clínica Parceira").exists()

    _authenticate(api_client, tenant, laboratory)
    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie empresa nome Empresa Bloqueada NUIT 000000001",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not Company.objects.filter(tenant=tenant, nuit="000000001").exists()


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
