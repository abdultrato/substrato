from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
import pytest

from apps.ai_assistant.models import (
    AiInvestigation,
    AiKnowledgeEntry,
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
from apps.human_resources.models.absence import Absence
from apps.human_resources.models.disciplinary_process import DisciplinaryProcess
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.profession import Profession
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.work_schedule import WorkSchedule
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.incidents.models.incident import Incident
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.insurer.models.tenant_coverage_plan import TenantCoveragePlan
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maternity.models.pregnancy import Pregnancy
from apps.maintenance.models.maintenance import Maintenance
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem
from apps.monitoring.models import SystemError, TransactionalOutboxEvent
from apps.nursing.models import (
    NursingEvolution,
    NursingPrescription,
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureItem,
    Ward,
    WardAdmission,
    WardBed,
)
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.reception.models.reception_checkin import ReceptionCheckin
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate
from apps.pharmacy.models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.material_requisition import MaterialRequisition, MaterialRequisitionStatus, RequestingSector
from apps.pharmacy.models.material_requisition_item import MaterialRequisitionItem
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem
from apps.surgery.models.surgery import LargeSurgery, SmallSurgery, Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure
from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.tenant_usage import TenantUsage
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


def _issued_invoice_with_manual_item(tenant: Tenant, patient: Patient, *, total="100.00") -> Invoice:
    invoice = Invoice.objects.create(tenant=tenant, patient=patient, origin=Invoice.Origin.MIXED)
    InvoiceItem.objects.create(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.AJUSTE,
        description="Valor operacional IA",
        quantity=Decimal("1.00"),
        unit_price=Decimal(str(total)),
        vat_percentage=Decimal("0.00"),
        applies_vat=False,
    )
    invoice.refresh_from_db()
    invoice.status = Invoice.Status.ISSUED
    invoice.save(update_fields=["status"])
    return invoice


def _pharmacy_product_with_lot(
    tenant: Tenant,
    *,
    name: str = "Paracetamol IA",
    lot_number: str = "LOT-AI-001",
    quantity: int = 20,
    price: str = "10.00",
) -> tuple[Product, Lot]:
    product = Product.objects.create(
        tenant=tenant,
        name=name,
        type=Product.ProductType.MEDICAMENTO,
        sale_price=Decimal(price),
        vat_percentage=Decimal("0.00"),
    )
    lot = Lot.objects.create(
        tenant=tenant,
        product=product,
        lot_number=lot_number,
        expiration_date=date(2030, 1, 1),
        initial_quantity=quantity,
        sale_price=Decimal(price),
    )
    return product, lot


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
def test_ai_chat_asks_clarification_before_running_tools_for_vague_message(api_client):
    tenant = _tenant(identifier="tn-ai-clarify", domain="tn-ai-clarify.local")
    user = _user(tenant, "recepcao_ai_clarify", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Preciso ver isso",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert data["conversation"]["status"] == "needs_clarification"
    assert "preciso fechar melhor o objectivo" in data["answer"].lower()
    assert "Quantos pacientes deram entrada hoje?" in data["conversation"]["options"]
    assert data["tool_calls"] == []
    assert data["suggested_actions"] == []

    session = AiSession.objects.get(id=data["session_id"])
    assert session.metadata["intent_clarification"]["status"] == "needs_clarification"
    assert not AiToolCall.objects.filter(session=session).exists()


@pytest.mark.django_db
def test_ai_chat_resolves_clarification_followup_into_data_investigation(api_client):
    tenant = _tenant(identifier="tn-ai-clarify-followup", domain="tn-ai-clarify-followup.local")
    user = _user(tenant, "recepcao_ai_clarify_followup", GROUPS["RECEPCAO"])
    Patient.objects.create(tenant=tenant, name="Paciente Clarificação 1")
    Patient.objects.create(tenant=tenant, name="Paciente Clarificação 2")
    _authenticate(api_client, tenant, user)

    first_response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "Preciso ver isso", "language": "pt", "active_module": "ai"},
        format="json",
    )
    assert first_response.status_code == 200, _response_data(first_response)
    first_data = _response_data(first_response)

    second_response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "session_id": first_data["session_id"],
            "message": "quero investigar pacientes",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert second_response.status_code == 200, _response_data(second_response)
    data = _response_data(second_response)
    assert data["conversation"]["status"] == "answered"
    assert any(call["tool_name"] == "explore_database" and call["status"] == "success" for call in data["tool_calls"])
    assert not any(call["tool_name"] == "prepare_operational_task" for call in data["tool_calls"])
    assert "Pacientes" in data["answer"]

    session = AiSession.objects.get(id=first_data["session_id"])
    assert "intent_clarification" not in session.metadata
    assert session.metadata["conversation_focus"]["resources"][0]["basename"] == "clinical-patient"


@pytest.mark.django_db
def test_ai_sql_analytics_counts_patient_entries_between_dates(api_client):
    tenant = _tenant(identifier="tn-ai-sql-entries", domain="tn-ai-sql-entries.local")
    user = _user(tenant, "recepcao_ai_sql_entries", GROUPS["RECEPCAO"])
    patient_a = Patient.objects.create(tenant=tenant, name="Paciente Entrada A")
    patient_b = Patient.objects.create(tenant=tenant, name="Paciente Entrada B")
    checkin_a = ReceptionCheckin.objects.create(tenant=tenant, patient=patient_a, status=ReceptionCheckin.Status.COMPLETED)
    checkin_b = ReceptionCheckin.objects.create(tenant=tenant, patient=patient_b, status=ReceptionCheckin.Status.WAITING)
    checkin_outside = ReceptionCheckin.objects.create(tenant=tenant, patient=patient_a, status=ReceptionCheckin.Status.WAITING)
    ReceptionCheckin.objects.filter(id=checkin_a.id).update(arrived_at=datetime(2026, 5, 2, 9, 0, tzinfo=timezone.get_current_timezone()))
    ReceptionCheckin.objects.filter(id=checkin_b.id).update(arrived_at=datetime(2026, 5, 3, 10, 0, tzinfo=timezone.get_current_timezone()))
    ReceptionCheckin.objects.filter(id=checkin_outside.id).update(arrived_at=datetime(2026, 5, 9, 10, 0, tzinfo=timezone.get_current_timezone()))
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Fale-me de quantos pacientes deram entrada a partir do dia 2026-05-01 a 2026-05-05",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "run_sql_analytics" and call["status"] == "success" for call in data["tool_calls"])
    assert "2 entrada" in data["answer"]
    assert data["investigation"]["intent"] == "sql_analytics"


@pytest.mark.django_db
def test_ai_sql_analytics_reports_pharmacy_stock_as_of_date(api_client):
    tenant = _tenant(identifier="tn-ai-sql-stock", domain="tn-ai-sql-stock.local")
    user = _user(tenant, "farmacia_ai_sql_stock", GROUPS["FARMACIA"])
    product = Product.objects.create(tenant=tenant, name="Medicação K", type=Product.ProductType.MEDICAMENTO)
    lot = Lot.objects.create(
        tenant=tenant,
        product=product,
        lot_number="K-001",
        expiration_date=date(2027, 1, 1),
        initial_quantity=50,
    )
    initial_movement = InventoryMovement.objects.get(tenant=tenant, lot=lot, type=MovementType.ENTRADA)
    salida = InventoryMovement.objects.create(
        tenant=tenant,
        lot=lot,
        type=MovementType.SAIDA,
        origin=MovementOrigin.AJUSTE,
        quantity=7,
    )
    Product.objects.filter(id=product.id).update(created_at=datetime(2026, 5, 1, 8, 0, tzinfo=timezone.get_current_timezone()))
    Lot.objects.filter(id=lot.id).update(created_at=datetime(2026, 5, 1, 8, 5, tzinfo=timezone.get_current_timezone()))
    InventoryMovement.objects.filter(id=initial_movement.id).update(created_at=datetime(2026, 5, 1, 8, 10, tzinfo=timezone.get_current_timezone()))
    InventoryMovement.objects.filter(id=salida.id).update(created_at=datetime(2026, 5, 10, 11, 0, tzinfo=timezone.get_current_timezone()))
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Diga-me qual era o estoque de medicação K no dia 2026-05-11",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "run_sql_analytics" and call["status"] == "success" for call in data["tool_calls"])
    assert "43 unidade" in data["answer"]
    assert "Medicação K" in data["answer"]
    assert data["investigation"]["intent"] == "sql_analytics"


@pytest.mark.django_db
def test_ai_sql_analytics_understands_natural_patient_date(api_client):
    tenant = _tenant(identifier="tn-ai-sql-today", domain="tn-ai-sql-today.local")
    user = _user(tenant, "recepcao_ai_sql_today", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Hoje IA")
    checkin = ReceptionCheckin.objects.create(tenant=tenant, patient=patient, status=ReceptionCheckin.Status.WAITING)
    ReceptionCheckin.objects.filter(id=checkin.id).update(arrived_at=timezone.now())
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Quantos pacientes deram entrada hoje?",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "run_sql_analytics" and call["status"] == "success" for call in data["tool_calls"])
    assert "1 entrada" in data["answer"]


@pytest.mark.django_db
def test_ai_sql_analytics_understands_natural_stock_date(api_client):
    tenant = _tenant(identifier="tn-ai-sql-stock-natural", domain="tn-ai-sql-stock-natural.local")
    user = _user(tenant, "farmacia_ai_sql_stock_natural", GROUPS["FARMACIA"])
    yesterday = timezone.localdate() - timedelta(days=1)
    product = Product.objects.create(tenant=tenant, name="Paracetamol", type=Product.ProductType.MEDICAMENTO)
    lot = Lot.objects.create(
        tenant=tenant,
        product=product,
        lot_number="PAR-ONTEM-001",
        expiration_date=date(2027, 1, 1),
        initial_quantity=20,
    )
    initial_movement = InventoryMovement.objects.get(tenant=tenant, lot=lot, type=MovementType.ENTRADA)
    yesterday_dt = datetime(yesterday.year, yesterday.month, yesterday.day, 12, 0, tzinfo=timezone.get_current_timezone())
    Product.objects.filter(id=product.id).update(created_at=yesterday_dt)
    Lot.objects.filter(id=lot.id).update(created_at=yesterday_dt)
    InventoryMovement.objects.filter(id=initial_movement.id).update(created_at=yesterday_dt)
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Qual era o stock de medicação Paracetamol ontem?",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "run_sql_analytics" and call["status"] == "success" for call in data["tool_calls"])
    assert "20 unidade" in data["answer"]
    assert "Paracetamol" in data["answer"]


@pytest.mark.django_db
def test_ai_sql_analytics_counts_generic_education_resource(api_client):
    tenant = _tenant(identifier="tn-ai-sql-education", domain="tn-ai-sql-education.local")
    director = _user(tenant, "director_ai_sql_education", GROUPS["DIRETOR_ESCOLA"])
    student_user_a = _user(tenant, "student_sql_education_a", GROUPS["ESTUDANTE"])
    student_user_b = _user(tenant, "student_sql_education_b", GROUPS["ESTUDANTE"])
    student_user_outside = _user(tenant, "student_sql_education_outside", GROUPS["ESTUDANTE"])
    student_a = StudentProfile.objects.create(tenant=tenant, user=student_user_a, student_code="EST-SQL-001")
    student_b = StudentProfile.objects.create(tenant=tenant, user=student_user_b, student_code="EST-SQL-002")
    student_outside = StudentProfile.objects.create(tenant=tenant, user=student_user_outside, student_code="EST-SQL-003")
    StudentProfile.objects.filter(id=student_a.id).update(created_at=datetime(2026, 5, 2, 9, 0, tzinfo=timezone.get_current_timezone()))
    StudentProfile.objects.filter(id=student_b.id).update(created_at=datetime(2026, 5, 3, 10, 0, tzinfo=timezone.get_current_timezone()))
    StudentProfile.objects.filter(id=student_outside.id).update(created_at=datetime(2026, 6, 3, 10, 0, tzinfo=timezone.get_current_timezone()))
    _authenticate(api_client, tenant, director)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Quantos estudantes foram criados de 2026-05-01 a 2026-05-31?",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "run_sql_analytics" and call["status"] == "success" for call in data["tool_calls"])
    assert "2 registo" in data["answer"]
    assert "Estudantes" in data["answer"]
    assert data["investigation"]["intent"] == "sql_analytics"


@pytest.mark.django_db
def test_ai_sql_analytics_counts_generic_equipment_resource(api_client):
    tenant = _tenant(identifier="tn-ai-sql-equipment", domain="tn-ai-sql-equipment.local")
    admin = _user(tenant, "admin_ai_sql_equipment", GROUPS["ADMIN"], is_staff=True)
    equipment_a = Equipment.objects.create(tenant=tenant, name="Centrífuga SQL A", serial_number="EQ-SQL-001")
    equipment_b = Equipment.objects.create(tenant=tenant, name="Centrífuga SQL B", serial_number="EQ-SQL-002")
    equipment_outside = Equipment.objects.create(tenant=tenant, name="Centrífuga SQL C", serial_number="EQ-SQL-003")
    Equipment.objects.filter(id=equipment_a.id).update(created_at=datetime(2026, 5, 4, 9, 0, tzinfo=timezone.get_current_timezone()))
    Equipment.objects.filter(id=equipment_b.id).update(created_at=datetime(2026, 5, 5, 10, 0, tzinfo=timezone.get_current_timezone()))
    Equipment.objects.filter(id=equipment_outside.id).update(created_at=datetime(2026, 6, 5, 10, 0, tzinfo=timezone.get_current_timezone()))
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Quantos equipamentos foram criados entre 2026-05-01 e 2026-05-31?",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "run_sql_analytics" and call["status"] == "success" for call in data["tool_calls"])
    assert "2 registo" in data["answer"]
    assert "Equipamentos" in data["answer"]
    assert data["investigation"]["intent"] == "sql_analytics"

    search_response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Mostre equipamento código EQ-SQL-001",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert search_response.status_code == 200, _response_data(search_response)
    search_data = _response_data(search_response)
    assert any(call["tool_name"] == "run_sql_analytics" and call["status"] == "success" for call in search_data["tool_calls"])
    assert "1 registo" in search_data["answer"]
    assert "EQ-SQL-001" in search_data["answer"]


@pytest.mark.django_db
def test_ai_sql_analytics_builds_financial_insights_and_schema(api_client):
    tenant = _tenant(identifier="tn-ai-sql-finance", domain="tn-ai-sql-finance.local")
    admin = _user(tenant, "admin_ai_sql_finance", GROUPS["ADMIN"], is_staff=True)
    patient = Patient.objects.create(tenant=tenant, name="Paciente Financeiro IA")
    invoice_a = _issued_invoice_with_manual_item(tenant, patient, total="100.00")
    invoice_b = _issued_invoice_with_manual_item(tenant, patient, total="50.00")
    previous_invoice = _issued_invoice_with_manual_item(tenant, patient, total="25.00")

    today = timezone.localdate()
    current_dt = datetime(today.year, today.month, min(today.day, 5), 10, 0, tzinfo=timezone.get_current_timezone())
    previous_day = today.replace(day=1) - timedelta(days=1)
    previous_dt = datetime(previous_day.year, previous_day.month, previous_day.day, 10, 0, tzinfo=timezone.get_current_timezone())
    Invoice.objects.filter(id__in=[invoice_a.id, invoice_b.id]).update(created_at=current_dt)
    Invoice.objects.filter(id=previous_invoice.id).update(created_at=previous_dt)
    _authenticate(api_client, tenant, admin)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Quanto faturou este mês por estado?",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "run_sql_analytics" and call["status"] == "success" for call in data["tool_calls"])
    assert "Leitura automática" in data["answer"]
    assert "Indicadores numéricos" in data["answer"]

    analytics = data["schema"]["analytics"]
    assert analytics["resource_label"] == "Faturas"
    assert analytics["comparison"]["current_count"] == 2
    assert analytics["comparison"]["previous_count"] == 1
    assert analytics["insights"]
    assert analytics["next_questions"]
    total_summary = next(item for item in analytics["numeric_summaries"] if item["field"] == "total")
    assert Decimal(str(total_summary["total"])) == Decimal("150")


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
def test_ai_project_identity_answers_from_github_metadata(api_client, monkeypatch):
    from apps.ai_assistant.tools.project_identity import ProjectIdentityTool

    tenant = _tenant(identifier="tn-ai-project-identity", domain="tn-ai-project-identity.local")
    user = _user(tenant, "admin_ai_project_identity", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, user)

    monkeypatch.setattr(
        ProjectIdentityTool,
        "_load_metadata",
        lambda self: {
            "repository": {
                "full_name": "abdulltrato/substrato",
                "owner_login": "abdulltrato",
                "html_url": "https://github.com/abdulltrato/substrato",
                "created_at": "2026-02-25T01:45:35Z",
                "default_branch": "main",
                "data_source": "github_api",
            },
            "creator": {
                "name": "Abdul Daniel Trato",
                "email": "abdultrato@gmail.com",
                "login": "abdulltrato",
                "profile_url": "https://github.com/abdulltrato",
            },
            "first_commit": {
                "sha": "df5657b19ec9abef16936a30ded1c871234462ad",
                "short_sha": "df5657b19ec",
                "message": "Initial commit",
                "date": "2026-02-25T01:45:27Z",
                "author_name": "Abdul Daniel Trato",
                "author_email": "abdultrato@gmail.com",
                "author_login": "abdulltrato",
                "html_url": "https://github.com/abdulltrato/substrato/commit/df5657b19ec9abef16936a30ded1c871234462ad",
                "data_source": "github_api",
            },
            "latest_commit": {
                "sha": "cb8f7e76dfd81394c20021605aa22d5970ca0831",
                "short_sha": "cb8f7e76dfd",
                "message": "Expand AI analytics guidance",
                "date": "2026-05-21T13:37:41+02:00",
                "author_name": "Abdul Daniel Trato",
            },
            "evidence": {
                "primary": "GitHub API",
                "limitation_pt": "Se o trabalho tiver começado fora do GitHub antes do primeiro commit público, essa data não aparece nestes dados.",
                "limitation_en": "If work started outside GitHub before the first public commit, that date is not visible in these data.",
            },
        },
    )

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Quem criou o sistema e quando começou a ser desenvolvido?",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "get_project_identity" and call["status"] == "success" for call in data["tool_calls"])
    assert "Abdul Daniel Trato" in data["answer"]
    assert "2026-02-25T01:45:27Z" in data["answer"]
    assert "GitHub API" in data["answer"]
    assert data["schema"]["project_identity"]["repository"]["full_name"] == "abdulltrato/substrato"
    assert data["investigation"]["intent"] == "project_identity"
    assert any(source["type"] == "github" for source in data["sources"])


@pytest.mark.django_db
def test_ai_predicted_questions_answer_known_system_usage(api_client):
    tenant = _tenant(identifier="tn-ai-knowledge", domain="tn-ai-knowledge.local")
    user = _user(tenant, "admin_ai_knowledge", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "O que a IA consegue fazer?", "language": "pt", "active_module": "ai"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "answer_predicted_question" and call["status"] == "success" for call in data["tool_calls"])
    assert "A IA Operacional identifica" in data["answer"]
    assert data["schema"]["knowledge_base"]["status"] == "answered"
    assert data["schema"]["knowledge_base"]["follow_ups"]
    assert data["investigation"]["intent"] == "knowledge_base"


@pytest.mark.django_db
def test_ai_predicted_questions_suggests_typo_and_answers_selected_suggestion(api_client):
    tenant = _tenant(identifier="tn-ai-knowledge-typo", domain="tn-ai-knowledge-typo.local")
    user = _user(tenant, "admin_ai_knowledge_typo", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, user)

    typo_response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "comu crio paciete", "language": "pt", "active_module": "ai"},
        format="json",
    )

    assert typo_response.status_code == 200, _response_data(typo_response)
    typo_data = _response_data(typo_response)
    assert any(call["tool_name"] == "answer_predicted_question" and call["status"] == "success" for call in typo_data["tool_calls"])
    assert "Quis dizer" in typo_data["answer"]
    suggestions = typo_data["schema"]["knowledge_base"]["suggestions"]
    assert suggestions
    assert suggestions[0]["question"] == "Como criar um paciente pela IA?"

    selected_response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "session_id": typo_data["session_id"],
            "message": suggestions[0]["question"],
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert selected_response.status_code == 200, _response_data(selected_response)
    selected_data = _response_data(selected_response)
    assert selected_data["schema"]["knowledge_base"]["status"] == "answered"
    assert "Crie um paciente chamado" in selected_data["answer"]


@pytest.mark.django_db
def test_ai_knowledge_base_uses_editable_database_entry(api_client):
    tenant = _tenant(identifier="tn-ai-knowledge-db", domain="tn-ai-knowledge-db.local")
    user = _user(tenant, "admin_ai_knowledge_db", GROUPS["ADMIN"], is_staff=True)
    AiKnowledgeEntry.objects.create(
        tenant=tenant,
        slug="protocolo-visita",
        title="Protocolo de visita",
        category="operacao",
        module_key="reception",
        priority=95,
        questions_pt=["Qual é o protocolo de visita?"],
        aliases_pt=["horario de visita", "como funciona a visita"],
        semantic_terms=["visita", "acompanhante", "familia", "recepcao"],
        answer_pt="O protocolo de visita deve ser confirmado na recepção antes da entrada do acompanhante.",
        follow_ups_pt=["Como registar entrada pela recepção?"],
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "Qual é o protocolo de visita?", "language": "pt", "active_module": ""},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "answer_predicted_question" and call["status"] == "success" for call in data["tool_calls"])
    assert "confirmado na recepção" in data["answer"]
    assert data["schema"]["knowledge_base"]["source"] == "database"
    assert data["schema"]["knowledge_base"]["database_id"]
    assert any(source["label"] == "AI editable knowledge base" for source in data["sources"])


@pytest.mark.django_db
def test_ai_knowledge_base_semantic_search_understands_synonyms(api_client):
    tenant = _tenant(identifier="tn-ai-knowledge-semantic", domain="tn-ai-knowledge-semantic.local")
    user = _user(tenant, "admin_ai_knowledge_semantic", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {"message": "como meto um doente novo", "language": "pt", "active_module": "clinical"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert any(call["tool_name"] == "answer_predicted_question" and call["status"] == "success" for call in data["tool_calls"])
    assert data["schema"]["knowledge_base"]["status"] == "answered"
    assert data["schema"]["knowledge_base"]["question"] == "Como criar um paciente pela IA?"


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
def test_ai_monitoring_crud_creates_updates_and_deletes_system_error_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-monitoring-crud", domain="tn-ai-monitoring-crud.local")
    admin = _user(tenant, "admin_ai_monitoring_crud", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        'Crie erro do sistema {"utilizador":"admin_ai_monitoring_crud","metodo":"POST","rota":"/api/v1/clinical/resultitem/","url_completa":"/api/v1/clinical/resultitem/?debug=1","status_http":503,"duracao_ms":230,"tipo_erro":"OperationalError","mensagem":"database unavailable","view":"clinical-resultitem","acao":"create","objecto":"REQ-AI-001"}',
    )

    assert create_action.payload["basename"] == "monitoring-error"
    assert create_action.payload["data"]["user"] == admin.id
    assert create_action.payload["data"]["method"] == "POST"
    assert create_action.payload["data"]["path"] == "/api/v1/clinical/resultitem/"
    assert create_action.payload["data"]["status_code"] == 503
    assert create_action.payload["data"]["exception_class"] == "OperationalError"

    _confirm_ai_action(api_client, create_action)
    system_error = SystemError.objects.get(tenant=tenant, object_id="REQ-AI-001")
    assert system_error.user == admin
    assert system_error.duration_ms == 230
    assert system_error.view_basename == "clinical-resultitem"

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere erro do sistema custom_id {system_error.custom_id} {{"status_http":500,"mensagem":"database recovered after retry","tipo_erro":"DatabaseError"}}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "monitoring-error"
    assert update_action.payload["object_ref"] == system_error.custom_id
    assert update_action.payload["data"]["status_code"] == 500
    assert update_action.payload["data"]["exception_class"] == "DatabaseError"

    _confirm_ai_action(api_client, update_action)
    system_error.refresh_from_db()
    assert system_error.status_code == 500
    assert system_error.exception_class == "DatabaseError"
    assert system_error.message == "database recovered after retry"

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova erro do sistema id {system_error.id}",
        action_type="ai_crud_delete",
    )

    assert delete_action.payload["basename"] == "monitoring-error"
    _confirm_ai_action(api_client, delete_action)
    assert SystemError.all_objects.get(id=system_error.id).deleted is True


@pytest.mark.django_db
def test_ai_monitoring_crud_denies_system_error_create_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-monitoring-denied", domain="tn-ai-monitoring-denied.local")
    user = _user(tenant, "recepcao_ai_monitoring_denied", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie erro do sistema {"metodo":"GET","rota":"/api/v1/admin-only/","status_http":500,"tipo_erro":"PermissionError","mensagem":"blocked"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem acesso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not SystemError.objects.filter(tenant=tenant, path="/api/v1/admin-only/").exists()


@pytest.mark.django_db
def test_ai_notifications_crud_creates_updates_and_deletes_resources_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-notifications-crud", domain="tn-ai-notifications-crud.local")
    admin = _user(tenant, "admin_ai_notifications_crud", GROUPS["ADMIN"], is_staff=True)
    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente Notificação IA",
        document_number="BI-NOTIF-001",
    )
    _authenticate(api_client, tenant, admin)

    _data, template_action = _prepare_ai_crud_action(
        api_client,
        'Crie template de notificação {"nome":"Aviso IA","conteudo":"Mensagem automática de notificação"}',
    )

    assert template_action.payload["basename"] == "notifications-template"
    assert template_action.payload["data"]["name"] == "Aviso IA"
    assert template_action.payload["data"]["content"] == "Mensagem automática de notificação"

    _confirm_ai_action(api_client, template_action)
    template = NotificationTemplate.objects.get(name="Aviso IA")

    _data, template_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere template de notificação id {template.id} {{"conteudo":"Mensagem automática actualizada"}}',
        action_type="ai_crud_update",
    )

    assert template_update_action.payload["basename"] == "notifications-template"
    assert template_update_action.payload["data"]["content"] == "Mensagem automática actualizada"
    _confirm_ai_action(api_client, template_update_action)
    template.refresh_from_db()
    assert template.content == "Mensagem automática actualizada"

    _data, notification_action = _prepare_ai_crud_action(
        api_client,
        'Crie notificação {"paciente":"Paciente Notificação IA","destinatario":"utente@example.com","canal":"email","assunto":"Resultado disponível","tipo_evento":"resultado","referencia_externa":"NOTIF-AI-001","mensagem":"O seu resultado está disponível.","enviada":false}',
    )

    assert notification_action.payload["basename"] == "notifications-notification"
    assert notification_action.payload["data"]["patient"] == patient.id
    assert notification_action.payload["data"]["recipient"] == "utente@example.com"
    assert notification_action.payload["data"]["channel"] == Notification.Channel.EMAIL
    assert notification_action.payload["data"]["event_type"] == Notification.EventType.RESULTADO_DISPONIVEL
    assert notification_action.payload["data"]["sent"] is False

    _confirm_ai_action(api_client, notification_action)
    notification = Notification.objects.get(external_reference="NOTIF-AI-001")
    assert notification.patient == patient
    assert notification.sent is False

    _data, notification_update_action = _prepare_ai_crud_action(
        api_client,
        'Altere notificação external_reference NOTIF-AI-001 {"enviada":true,"assunto":"Resultado confirmado"}',
        action_type="ai_crud_update",
    )

    assert notification_update_action.payload["basename"] == "notifications-notification"
    assert notification_update_action.payload["object_ref"] == "NOTIF-AI-001"
    assert notification_update_action.payload["data"]["sent"] is True
    assert notification_update_action.payload["data"]["subject"] == "Resultado confirmado"

    _confirm_ai_action(api_client, notification_update_action)
    notification.refresh_from_db()
    assert notification.sent is True
    assert notification.subject == "Resultado confirmado"

    _data, log_action = _prepare_ai_crud_action(
        api_client,
        f'Crie log de envio {{"notificacao":{notification.id},"estado":"accepted","resposta":"Gateway aceitou"}}',
    )

    assert log_action.payload["basename"] == "notifications-logenvio"
    assert log_action.payload["data"]["notification"] == notification.id
    assert log_action.payload["data"]["status"] == "accepted"

    _confirm_ai_action(api_client, log_action)
    delivery_log = DeliveryLog.objects.get(notification=notification)
    assert delivery_log.response == "Gateway aceitou"

    _data, log_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere log de envio id {delivery_log.id} {{"estado":"delivered","resposta":"Entregue ao provedor"}}',
        action_type="ai_crud_update",
    )

    assert log_update_action.payload["basename"] == "notifications-logenvio"
    assert log_update_action.payload["data"]["status"] == "delivered"
    _confirm_ai_action(api_client, log_update_action)
    delivery_log.refresh_from_db()
    assert delivery_log.status == "delivered"
    assert delivery_log.response == "Entregue ao provedor"

    _data, log_delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova log de envio id {delivery_log.id}",
        action_type="ai_crud_delete",
    )

    assert log_delete_action.payload["basename"] == "notifications-logenvio"
    _confirm_ai_action(api_client, log_delete_action)
    assert not DeliveryLog.objects.filter(id=delivery_log.id).exists()

    _data, notification_delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova notificação id {notification.id}",
        action_type="ai_crud_delete",
    )

    assert notification_delete_action.payload["basename"] == "notifications-notification"
    _confirm_ai_action(api_client, notification_delete_action)
    assert not Notification.objects.filter(id=notification.id).exists()

    _data, template_delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova template de notificação id {template.id}",
        action_type="ai_crud_delete",
    )

    assert template_delete_action.payload["basename"] == "notifications-template"
    _confirm_ai_action(api_client, template_delete_action)
    assert not NotificationTemplate.objects.filter(id=template.id).exists()


@pytest.mark.django_db
def test_ai_notifications_crud_denies_notification_create_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-notifications-denied", domain="tn-ai-notifications-denied.local")
    user = _user(tenant, "recepcao_ai_notifications_denied", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie notificação {"destinatario":"bloqueado@example.com","canal":"email","mensagem":"Bloqueada"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem acesso" in data["answer"].lower()
    assert not [action for action in data["suggested_actions"] if action["action_type"].startswith("ai_crud_")]
    assert not Notification.objects.filter(recipient="bloqueado@example.com").exists()


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
def test_ai_reception_crud_creates_updates_and_deletes_checkin(api_client):
    tenant = _tenant(identifier="tn-ai-reception-checkin", domain="tn-ai-reception-checkin.local")
    user = _user(tenant, "recepcao_ai_reception_checkin", GROUPS["RECEPCAO"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Checkin IA", document_number="BI-REC-001")
    _authenticate(api_client, tenant, user)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        (
            'Crie check-in de recepção {"paciente":"Paciente Checkin IA",'
            '"prioridade":"urgente","motivo":"Triagem inicial","observacoes":"Dor moderada"}'
        ),
    )

    assert create_action.payload["basename"] == "reception-checkin"
    assert create_action.payload["data"]["patient"] == patient.id
    assert create_action.payload["data"]["priority"] == ReceptionCheckin.Priority.URGENT
    assert create_action.payload["data"]["reason"] == "Triagem inicial"
    assert create_action.payload["data"]["notes"] == "Dor moderada"

    _confirm_ai_action(api_client, create_action)
    checkin = ReceptionCheckin.objects.get(tenant=tenant, patient=patient)
    assert checkin.status == ReceptionCheckin.Status.WAITING
    assert checkin.created_by == user

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere check-in de recepção id {checkin.id} {{"prioridade":"preferencial","observacoes":"Reavaliado na fila"}}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "reception-checkin"
    assert update_action.payload["data"]["priority"] == ReceptionCheckin.Priority.PREFERRED
    assert update_action.payload["data"]["notes"] == "Reavaliado na fila"

    _confirm_ai_action(api_client, update_action)
    checkin.refresh_from_db()
    assert checkin.priority == ReceptionCheckin.Priority.PREFERRED
    assert checkin.notes == "Reavaliado na fila"
    assert checkin.updated_by == user

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova check-in de recepção id {checkin.id}",
        action_type="ai_crud_delete",
    )

    assert delete_action.payload["basename"] == "reception-checkin"
    _confirm_ai_action(api_client, delete_action)
    assert ReceptionCheckin.all_objects.get(id=checkin.id).deleted is True


@pytest.mark.django_db
def test_ai_reception_crud_denies_checkin_create_without_permission(api_client):
    tenant = _tenant(identifier="tn-ai-reception-denied", domain="tn-ai-reception-denied.local")
    user = _user(tenant, "contabilidade_ai_reception_denied", GROUPS["CONTABILIDADE"])
    Patient.objects.create(tenant=tenant, name="Paciente Recepcao Bloqueado", document_number="BI-REC-BLOCK")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": (
                'Crie check-in de recepção {"paciente":"Paciente Recepcao Bloqueado",'
                '"prioridade":"normal","motivo":"Sem permissão"}'
            ),
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não" in data["answer"].lower()
    assert not [action for action in data["suggested_actions"] if action["action_type"].startswith("ai_crud_")]
    assert not ReceptionCheckin.objects.filter(tenant=tenant, patient__name__icontains="Bloqueado").exists()


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
    assert maintenance_action.payload["basename"] == "maintenance-maintenance"
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
def test_ai_maintenance_crud_creates_updates_and_deletes_for_maintenance_group(api_client):
    tenant = _tenant(identifier="tn-ai-maintenance-crud", domain="tn-ai-maintenance-crud.local")
    user = _user(tenant, "manutencao_ai_maintenance_crud", GROUPS["MANUTENCAO"])
    equipment = Equipment.objects.create(
        tenant=tenant,
        name="Autoclave Central",
        serial_number="EQ-MNT-AI-001",
        manufacturer="Tuttnauer",
    )
    _authenticate(api_client, tenant, user)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Crie manutenção equipamento {equipment.serial_number} tipo semanal "
            "agendada para 2026-05-10 realizada em 2026-05-11 descrição Verificação de segurança técnico Marta"
        ),
    )
    assert create_action.payload["basename"] == "maintenance-maintenance"
    assert create_action.payload["data"]["equipment"] == equipment.id
    assert create_action.payload["data"]["type"] == Maintenance.Type.WEEKLY
    assert create_action.payload["data"]["technician"] == "Marta"
    _confirm_ai_action(api_client, create_action)
    maintenance = Maintenance.objects.get(tenant=tenant, equipment=equipment, scheduled_date="2026-05-10")
    assert maintenance.description == "Verificação de segurança"
    assert maintenance.performed_date.isoformat() == "2026-05-11"

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f"Atualize manutenção id {maintenance.id} técnico Luís descrição Calibração concluída realizada em 2026-05-12",
        action_type="ai_crud_update",
    )
    assert update_action.payload["basename"] == "maintenance-maintenance"
    assert update_action.payload["object_ref"] == str(maintenance.id)
    assert update_action.payload["data"]["technician"] == "Luís"
    assert update_action.payload["data"]["description"] == "Calibração concluída"
    assert update_action.payload["data"]["performed_date"] == "2026-05-12"
    _confirm_ai_action(api_client, update_action)

    maintenance.refresh_from_db()
    assert maintenance.technician == "Luís"
    assert maintenance.description == "Calibração concluída"
    assert maintenance.performed_date.isoformat() == "2026-05-12"

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova manutenção id {maintenance.id}",
        action_type="ai_crud_delete",
    )
    assert delete_action.payload["basename"] == "maintenance-maintenance"
    _confirm_ai_action(api_client, delete_action)
    removed = Maintenance.all_objects.get(id=maintenance.id)
    assert removed.deleted is True


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
def test_ai_inspections_crud_creates_updates_and_deletes_for_maintenance_group(api_client):
    tenant = _tenant(identifier="tn-ai-inspections-crud", domain="tn-ai-inspections-crud.local")
    user = _user(tenant, "manutencao_ai_inspections_crud", GROUPS["MANUTENCAO"])
    equipment = Equipment.objects.create(
        tenant=tenant,
        name="Centrífuga de Segurança",
        serial_number="EQ-INSP-AI-001",
        manufacturer="Eppendorf",
    )
    _authenticate(api_client, tenant, user)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Create inspections equipment {equipment.serial_number} date 2026-05-09 "
            "operation status working cleaning yes assessment Safety check passed notes No anomaly"
        ),
    )
    assert create_action.payload["basename"] == "equipment-daily_inspection"
    assert create_action.payload["data"]["equipment"] == equipment.id
    assert create_action.payload["data"]["operation_status"] == DailyInspection.Funcionamento.FUNCIONANDO
    assert create_action.payload["data"]["cleaning_performed"] is True
    assert create_action.payload["data"]["assessment"] == "Safety check passed"
    _confirm_ai_action(api_client, create_action)
    inspection = DailyInspection.objects.get(tenant=tenant, equipment=equipment, date="2026-05-09")
    assert inspection.notes == "No anomaly"

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f"Update inspections id {inspection.id} operation status offline cleaning no notes Equipment powered down",
        action_type="ai_crud_update",
    )
    assert update_action.payload["basename"] == "equipment-daily_inspection"
    assert update_action.payload["object_ref"] == str(inspection.id)
    assert update_action.payload["data"]["operation_status"] == DailyInspection.Funcionamento.DESLIGADO
    assert update_action.payload["data"]["cleaning_performed"] is False
    assert update_action.payload["data"]["notes"] == "Equipment powered down"
    _confirm_ai_action(api_client, update_action)

    inspection.refresh_from_db()
    assert inspection.operation_status == DailyInspection.Funcionamento.DESLIGADO
    assert inspection.cleaning_performed is False
    assert inspection.notes == "Equipment powered down"

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Delete inspections id {inspection.id}",
        action_type="ai_crud_delete",
    )
    assert delete_action.payload["basename"] == "equipment-daily_inspection"
    _confirm_ai_action(api_client, delete_action)
    removed = DailyInspection.all_objects.get(id=inspection.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_inspections_crud_denies_write_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-inspections-denied", domain="tn-ai-inspections-denied.local")
    user = _user(tenant, "recepcao_ai_inspections_denied", GROUPS["RECEPCAO"])
    equipment = Equipment.objects.create(tenant=tenant, name="Equipamento Inspeção Bloqueada", serial_number="EQ-INSP-BLQ-001")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Create inspections equipment {equipment.serial_number} operation status working assessment Bloqueado",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not DailyInspection.objects.filter(tenant=tenant, equipment=equipment, assessment="Bloqueado").exists()


@pytest.mark.django_db
def test_ai_incidents_crud_creates_updates_and_deletes_for_maintenance_group(api_client):
    tenant = _tenant(identifier="tn-ai-incidents-crud", domain="tn-ai-incidents-crud.local")
    user = _user(tenant, "manutencao_ai_incidents_crud", GROUPS["MANUTENCAO"])
    equipment = Equipment.objects.create(
        tenant=tenant,
        name="Analisador de Bioquímica",
        serial_number="EQ-INC-AI-001",
        manufacturer="Mindray",
    )
    _authenticate(api_client, tenant, user)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        (
            f"Create incidents equipment {equipment.serial_number} date 2026-05-08T10:30:00+02:00 "
            "type breakdown description Rotor failure support contact 841234567 resolved no"
        ),
    )
    assert create_action.payload["basename"] == "equipment-incident"
    assert create_action.payload["data"]["equipment"] == equipment.id
    assert create_action.payload["data"]["type"] == Incident.Type.BREAKDOWN
    assert create_action.payload["data"]["description"] == "Rotor failure"
    assert create_action.payload["data"]["support_contact"] == "841234567"
    assert create_action.payload["data"]["resolved"] is False
    _confirm_ai_action(api_client, create_action)
    incident = Incident.objects.get(tenant=tenant, equipment=equipment, support_contact="841234567")

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f"Update incidents id {incident.id} resolved yes support contact 849999999",
        action_type="ai_crud_update",
    )
    assert update_action.payload["basename"] == "equipment-incident"
    assert update_action.payload["object_ref"] == str(incident.id)
    assert update_action.payload["data"]["resolved"] is True
    assert update_action.payload["data"]["support_contact"] == "849999999"
    _confirm_ai_action(api_client, update_action)

    incident.refresh_from_db()
    assert incident.resolved is True
    assert incident.support_contact == "849999999"

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Delete incidents id {incident.id}",
        action_type="ai_crud_delete",
    )
    assert delete_action.payload["basename"] == "equipment-incident"
    _confirm_ai_action(api_client, delete_action)
    removed = Incident.all_objects.get(id=incident.id)
    assert removed.deleted is True


@pytest.mark.django_db
def test_ai_incidents_crud_denies_write_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-incidents-denied", domain="tn-ai-incidents-denied.local")
    user = _user(tenant, "recepcao_ai_incidents_denied", GROUPS["RECEPCAO"])
    equipment = Equipment.objects.create(tenant=tenant, name="Equipamento Bloqueado", serial_number="EQ-INC-BLQ-001")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": f"Create incidents equipment {equipment.serial_number} type incident description Bloqueado",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not Incident.objects.filter(tenant=tenant, equipment=equipment, description="Bloqueado").exists()


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
def test_ai_identity_crud_creates_user_profile_and_reset_token(api_client):
    tenant = _tenant(identifier="tn-ai-identity-crud", domain="tn-ai-identity-crud.local")
    admin = _user(tenant, "admin_ai_identity_crud", GROUPS["ADMIN"], is_staff=True)
    reception_group, _ = Group.objects.get_or_create(name=GROUPS["RECEPCAO"])
    employee = Employee.objects.create(
        tenant=tenant,
        name="Profissional Identidade",
        document_number="BI-ID-001",
        email="prof.identity@example.com",
    )
    _authenticate(api_client, tenant, admin)

    _data, user_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie utilizador "
            '{"username": "identity_ai_created", "name": "Conta Identidade", '
            '"first_name": "Conta", "last_name": "Identidade", '
            '"email": "identity.created@example.com", "phone": "+258 84 321 1000", '
            '"password": "SafePass123!", "groups": ["Recepcionista"], "is_active": true}'
        ),
    )
    assert user_action.payload["basename"] == "identity-user"
    assert user_action.payload["data"]["username"] == "identity_ai_created"
    assert user_action.payload["data"]["groups"] == [reception_group.id]
    _confirm_ai_action(api_client, user_action)

    user_model = get_user_model()
    created_user = user_model.objects.get(tenant=tenant, username="identity_ai_created")
    assert created_user.email == "identity.created@example.com"
    assert created_user.check_password("SafePass123!")
    assert created_user.groups.filter(name=GROUPS["RECEPCAO"]).exists()

    _data, profile_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie perfil profissional "
            '{"user": "identity.created@example.com", "employee": "BI-ID-001", '
            '"role": "Recepção clínica", "professional_registration": "REG-ID-001", '
            '"department": "Recepção", "active": true}'
        ),
    )
    assert profile_action.payload["basename"] == "identity-perfilprofissional"
    assert profile_action.payload["data"]["user"] == created_user.id
    assert profile_action.payload["data"]["employee"] == employee.id
    _confirm_ai_action(api_client, profile_action)
    assert ProfessionalProfile.objects.filter(
        user=created_user,
        employee=employee,
        professional_registration="REG-ID-001",
        active=True,
    ).exists()

    _data, token_action = _prepare_ai_crud_action(
        api_client,
        'Crie token de redefinição {"user": "identity.created@example.com", "used": false}',
    )
    assert token_action.payload["basename"] == "identity-passwordresettoken"
    assert token_action.payload["data"]["user"] == created_user.id
    _confirm_ai_action(api_client, token_action)
    token = PasswordResetToken.objects.get(user=created_user)
    assert token.token
    assert token.used is False


@pytest.mark.django_db
def test_ai_identity_crud_updates_and_deactivates_user_with_rbac_denial(api_client):
    tenant = _tenant(identifier="tn-ai-identity-update", domain="tn-ai-identity-update.local")
    admin = _user(tenant, "admin_ai_identity_update", GROUPS["ADMIN"], is_staff=True)
    recepcao = _user(tenant, "recepcao_ai_identity_denied", GROUPS["RECEPCAO"])
    user_model = get_user_model()
    target = user_model.objects.create_user(
        username="identity_ai_target",
        name="Utilizador Antigo",
        email="identity.target@example.com",
        password="OldPass123!",
        tenant=tenant,
        is_active=True,
    )
    _authenticate(api_client, tenant, admin)

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        (
            "Altere utilizador email identity.target@example.com "
            "nome Utilizador Actualizado telefone +258 84 999 0000 ativo não"
        ),
        action_type="ai_crud_update",
    )
    assert update_action.payload["basename"] == "identity-user"
    assert update_action.payload["object_ref"] == "identity.target@example.com"
    assert update_action.payload["data"]["name"] == "Utilizador Actualizado"
    assert update_action.payload["data"]["phone"] == "+258 84 999 0000"
    assert update_action.payload["data"]["is_active"] is False
    _confirm_ai_action(api_client, update_action)

    target.refresh_from_db()
    assert target.name == "Utilizador Actualizado"
    assert target.phone == "+258 84 999 0000"
    assert target.is_active is False

    target.is_active = True
    target.save(update_fields=["is_active"])
    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova utilizador username {target.username}",
        action_type="ai_crud_delete",
    )
    assert delete_action.payload["basename"] == "identity-user"
    assert delete_action.payload["object_ref"] == target.username
    _confirm_ai_action(api_client, delete_action)

    target.refresh_from_db()
    assert target.is_active is False

    _authenticate(api_client, tenant, recepcao)
    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie utilizador username bloqueado_identity nome Bloqueado email bloqueado.identity@example.com",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not user_model.objects.filter(username="bloqueado_identity").exists()


@pytest.mark.django_db
def test_ai_human_resources_crud_creates_core_employee_and_payroll_resources(api_client):
    tenant = _tenant(identifier="tn-ai-human-resources-flow", domain="tn-ai-human-resources-flow.local")
    user = _user(tenant, "rh_ai_human_resources_flow", GROUPS["RECURSOS_HUMANOS"])
    _authenticate(api_client, tenant, user)

    _data, role_action = _prepare_ai_crud_action(
        api_client,
        "Crie cargo nome Técnico de RH descrição Gestão de pessoas médico não",
    )
    assert role_action.payload["basename"] == "human_resources-role"
    assert role_action.payload["data"]["name"] == "Técnico de RH"
    assert role_action.payload["data"]["is_doctor"] is False
    _confirm_ai_action(api_client, role_action)
    role = JobTitle.objects.get(tenant=tenant, name="Técnico De Rh")

    _data, profession_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie profissão nome Analista RH salário base 50000 valor hora ordinária 250 "
            "valor hora extraordinária 375 progressão meses 12 mudança carreira meses 24 "
            "aumento agregado 500 ativo sim"
        ),
    )
    assert profession_action.payload["basename"] == "human_resources-profissao"
    assert profession_action.payload["data"]["name"] == "Analista RH"
    assert profession_action.payload["data"]["base_salary"] == "50000"
    _confirm_ai_action(api_client, profession_action)
    profession = Profession.objects.get(tenant=tenant, name="Analista Rh")

    _data, employee_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie funcionário "
            '{"name": "Maria RH", "role": "Técnico De Rh", "profession": "Analista Rh", '
            '"nuit": "111222333", "document_number": "BI123RH", "email": "maria.rh@example.com", '
            '"phone": "+258 84 100 2000", "admission_date": "2024-01-15", '
            '"nominal_salary": "50000.00", "salary_increase": "2500.00", '
            '"base_month_hours": 176, "status": "ATIVO"}'
        ),
    )
    assert employee_action.payload["basename"] == "human_resources-employee"
    assert employee_action.payload["data"]["role"] == role.id
    assert employee_action.payload["data"]["profession"] == profession.id
    assert employee_action.payload["data"]["nuit"] == "111222333"
    _confirm_ai_action(api_client, employee_action)
    employee = Employee.objects.get(tenant=tenant, nuit="111222333")
    assert employee.name == "Maria Rh"
    assert employee.nominal_salary == Decimal("50000.00")

    _data, dependent_action = _prepare_ai_crud_action(
        api_client,
        (
            "Crie agregado familiar "
            '{"employee": "111222333", "name": "Ana RH", "relationship": "FILHO", '
            '"birth_date": "2015-02-01", "phone": "+258 84 200 3000", "lives_with_employee": true}'
        ),
    )
    assert dependent_action.payload["basename"] == "human_resources-agregadofamiliar"
    assert dependent_action.payload["data"]["employee"] == employee.id
    _confirm_ai_action(api_client, dependent_action)
    assert FamilyDependent.objects.filter(tenant=tenant, employee=employee, relationship=FamilyDependent.Parentesco.FILHO).exists()

    _data, schedule_action = _prepare_ai_crud_action(
        api_client,
        'Crie horário {"employee": "111222333", "weekday": 1, "start_time": "08:00", "end_time": "16:00", "active": true}',
    )
    assert schedule_action.payload["basename"] == "human_resources-horario"
    assert schedule_action.payload["data"]["employee"] == employee.id
    _confirm_ai_action(api_client, schedule_action)
    assert WorkSchedule.objects.filter(tenant=tenant, employee=employee, weekday=1).exists()

    _data, absence_action = _prepare_ai_crud_action(
        api_client,
        'Crie falta {"employee": "111222333", "date": "2026-05-03", "reason": "Consulta familiar", "justified": true}',
    )
    assert absence_action.payload["basename"] == "human_resources-falta"
    _confirm_ai_action(api_client, absence_action)
    absence = Absence.objects.get(tenant=tenant, employee=employee, date="2026-05-03")
    assert absence.justified is True

    _data, vacation_action = _prepare_ai_crud_action(
        api_client,
        (
            'Crie férias {"employee": "111222333", "start_date": "2026-06-01", '
            '"end_date": "2026-06-10", "status": "APROV", "notes": "Plano aprovado"}'
        ),
    )
    assert vacation_action.payload["basename"] == "human_resources-ferias"
    _confirm_ai_action(api_client, vacation_action)
    assert Vacation.objects.filter(tenant=tenant, employee=employee, status=Vacation.Status.APPROVED).exists()

    _data, overtime_action = _prepare_ai_crud_action(
        api_client,
        (
            'Crie hora extra {"employee": "111222333", "date": "2026-05-05", '
            '"kind": "EXTRAORDINARIA", "hours": "4.00", "multiplier": "1.50", "notes": "Fecho mensal"}'
        ),
    )
    assert overtime_action.payload["basename"] == "human_resources-horaextra"
    _confirm_ai_action(api_client, overtime_action)
    assert Overtime.objects.filter(tenant=tenant, employee=employee, hours=Decimal("4.00")).exists()

    _data, disciplinary_action = _prepare_ai_crud_action(
        api_client,
        (
            'Crie processo disciplinar {"employee": "111222333", "incident_date": "2026-05-06", '
            '"incident_type": "Atraso crítico", "severity": "GRAVE", "description": "Atraso repetido", '
            '"action_taken": "Advertência", "status": "ABERTO"}'
        ),
    )
    assert disciplinary_action.payload["basename"] == "human_resources-processodisciplinar"
    _confirm_ai_action(api_client, disciplinary_action)
    assert DisciplinaryProcess.objects.filter(tenant=tenant, employee=employee, severity=DisciplinaryProcess.Severity.SERIOUS).exists()

    _data, termination_action = _prepare_ai_crud_action(
        api_client,
        'Crie dispensa {"employee": "111222333", "date": "2026-12-31", "type": "RESCISAO", "reason": "Fim de contrato anual"}',
    )
    assert termination_action.payload["basename"] == "human_resources-dispensa"
    _confirm_ai_action(api_client, termination_action)
    assert Termination.objects.filter(tenant=tenant, employee=employee, type=Termination.Type.TERMINATION).exists()

    _data, payroll_action = _prepare_ai_crud_action(
        api_client,
        'Crie folha de pagamento {"employee": "111222333", "year": 2026, "month": 5, "other_discounts_value": "100.00"}',
    )
    assert payroll_action.payload["basename"] == "human_resources-folhapagamento"
    assert payroll_action.payload["data"]["employee"] == employee.id
    _confirm_ai_action(api_client, payroll_action)
    payroll = Payroll.objects.get(tenant=tenant, employee=employee, year=2026, month=5)
    assert payroll.nominal_salary == Decimal("50000.00")
    assert payroll.total_salary > Decimal("0.00")

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova falta id {absence.id}",
        action_type="ai_crud_delete",
    )
    assert delete_action.payload["basename"] == "human_resources-falta"
    _confirm_ai_action(api_client, delete_action)
    assert Absence.all_objects.get(id=absence.id).deleted is True


@pytest.mark.django_db
def test_ai_human_resources_crud_updates_employee_by_nuit_and_denies_reception(api_client):
    tenant = _tenant(identifier="tn-ai-human-resources-update", domain="tn-ai-human-resources-update.local")
    rh_user = _user(tenant, "rh_ai_human_resources_update", GROUPS["RECURSOS_HUMANOS"])
    recepcao = _user(tenant, "recepcao_ai_human_resources_denied", GROUPS["RECEPCAO"])
    employee = Employee.objects.create(
        tenant=tenant,
        name="Funcionario Atualizar",
        nuit="222333444",
        document_number="BI-RH-222",
        phone="+258 84 000 0000",
        nominal_salary=Decimal("20000.00"),
        status=Employee.Status.ACTIVE,
    )
    _authenticate(api_client, tenant, rh_user)

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        "Altere funcionário NUIT 222333444 telefone +258 84 555 6666 salário nominal 23000 aumento salarial 1500 estado inativo",
        action_type="ai_crud_update",
    )
    assert update_action.payload["basename"] == "human_resources-employee"
    assert update_action.payload["object_ref"] == "222333444"
    assert update_action.payload["data"]["phone"] == "+258 84 555 6666"
    assert update_action.payload["data"]["nominal_salary"] == "23000"
    assert update_action.payload["data"]["salary_increase"] == "1500"
    assert update_action.payload["data"]["status"] == Employee.Status.INACTIVE
    _confirm_ai_action(api_client, update_action)

    employee.refresh_from_db()
    assert employee.phone == "+258 84 555 6666"
    assert employee.nominal_salary == Decimal("23000.00")
    assert employee.salary_increase == Decimal("1500.00")
    assert employee.status == Employee.Status.INACTIVE

    _authenticate(api_client, tenant, recepcao)
    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "Crie funcionário nome Bloqueado RH NUIT 999000111",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não posso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not Employee.objects.filter(tenant=tenant, nuit="999000111").exists()


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
def test_ai_payments_crud_creates_updates_and_deletes_payment_for_accounting_group(api_client):
    tenant = _tenant(identifier="tn-ai-payments-payment", domain="tn-ai-payments-payment.local")
    user = _user(tenant, "contabilidade_ai_payments_payment", GROUPS["CONTABILIDADE"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Pagamento IA")
    invoice = _issued_invoice_with_manual_item(tenant, patient, total="100.00")
    _authenticate(api_client, tenant, user)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        (
            f'Crie pagamento {{"nome":"Pagamento IA","factura":"{invoice.custom_id}",'
            '"valor":"100.00","metodo":"dinheiro","estado":"pendente","referencia_externa":"PAY-AI-001"}'
        ),
    )

    assert create_action.payload["basename"] == "payments-payment"
    assert create_action.payload["data"]["invoice"] == invoice.id
    assert create_action.payload["data"]["value"] == "100.00"
    assert create_action.payload["data"]["method"] == Payment.Method.CASH
    assert create_action.payload["data"]["status"] == Payment.Status.PENDING

    _confirm_ai_action(api_client, create_action)
    payment = Payment.objects.get(tenant=tenant, external_reference="PAY-AI-001")
    assert payment.invoice == invoice
    assert payment.status == Payment.Status.PENDING

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        'Altere pagamento referencia_externa PAY-AI-001 {"estado":"confirmado"}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "payments-payment"
    assert update_action.payload["object_ref"] == "PAY-AI-001"
    assert update_action.payload["data"]["status"] == Payment.Status.CONFIRMED
    _confirm_ai_action(api_client, update_action)
    payment.refresh_from_db()
    invoice.refresh_from_db()
    assert payment.status == Payment.Status.CONFIRMED
    assert payment.paid_at is not None
    assert invoice.status in {Invoice.Status.ISSUED, Invoice.Status.PAID}

    removable = Payment.objects.create(
        tenant=tenant,
        name="Pagamento Remover IA",
        invoice=invoice,
        value=Decimal("1.00"),
        method=Payment.Method.CASH,
        external_reference="PAY-DEL-001",
    )

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        "Remova pagamento referencia_externa PAY-DEL-001",
        action_type="ai_crud_delete",
    )

    assert delete_action.payload["basename"] == "payments-payment"
    _confirm_ai_action(api_client, delete_action)
    assert Payment.all_objects.get(id=removable.id).deleted is True


@pytest.mark.django_db
def test_ai_payments_crud_creates_receipt_transaction_and_reconciliation(api_client):
    tenant = _tenant(identifier="tn-ai-payments-flow", domain="tn-ai-payments-flow.local")
    user = _user(tenant, "contabilidade_ai_payments_flow", GROUPS["CONTABILIDADE"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Fluxo Pagamentos IA")
    invoice = _issued_invoice_with_manual_item(tenant, patient, total="75.00")
    payment = Payment.objects.create(
        tenant=tenant,
        name="Pagamento Recibo IA",
        invoice=invoice,
        value=Decimal("75.00"),
        method=Payment.Method.MOBILE_MONEY,
        external_reference="PAY-REC-001",
    )
    _authenticate(api_client, tenant, user)

    _data, receipt_action = _prepare_ai_crud_action(
        api_client,
        (
            f'Crie recibo {{"factura":"{invoice.custom_id}","pagamento":"PAY-REC-001",'
            '"numero":"REC-AI-001","valor":"75.00"}'
        ),
    )

    assert receipt_action.payload["basename"] == "payments-receipt"
    assert receipt_action.payload["data"]["invoice"] == invoice.id
    assert receipt_action.payload["data"]["payment"] == payment.id
    assert receipt_action.payload["data"]["number"] == "REC-AI-001"
    _confirm_ai_action(api_client, receipt_action)
    receipt = Receipt.objects.get(number="REC-AI-001")
    assert receipt.value == Decimal("75.00")

    _data, receipt_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere recibo id {receipt.id} {{"valor":"70.00"}}',
        action_type="ai_crud_update",
    )

    assert receipt_update_action.payload["basename"] == "payments-receipt"
    assert receipt_update_action.payload["data"]["value"] == "70.00"
    _confirm_ai_action(api_client, receipt_update_action)
    receipt.refresh_from_db()
    assert receipt.value == Decimal("70.00")

    _data, transaction_action = _prepare_ai_crud_action(
        api_client,
        'Crie transação {"referencia_externa":"TX-AI-001","gateway":"mpesa","estado":"PENDING","resposta_gateway":"aguarda confirmação"}',
    )

    assert transaction_action.payload["basename"] == "payments-transaction"
    assert transaction_action.payload["data"]["external_reference"] == "TX-AI-001"
    assert transaction_action.payload["data"]["gateway"] == "mpesa"
    assert transaction_action.payload["data"]["status"] == "PENDING"
    _confirm_ai_action(api_client, transaction_action)
    gateway_transaction = Transaction.objects.get(external_reference="TX-AI-001")

    _data, reconciliation_action = _prepare_ai_crud_action(
        api_client,
        'Crie reconciliação de pagamento {"transacao":"TX-AI-001","confirmado":false}',
    )

    assert reconciliation_action.payload["basename"] == "payments-reconciliation"
    assert reconciliation_action.payload["data"]["transaction"] == gateway_transaction.id
    assert reconciliation_action.payload["data"]["confirmed"] is False
    _confirm_ai_action(api_client, reconciliation_action)
    reconciliation = Reconciliation.objects.get(transaction=gateway_transaction)

    _data, transaction_update_action = _prepare_ai_crud_action(
        api_client,
        'Altere transação referencia_externa TX-AI-001 {"estado":"PAID","resposta_gateway":"confirmado pelo gateway"}',
        action_type="ai_crud_update",
    )

    assert transaction_update_action.payload["basename"] == "payments-transaction"
    assert transaction_update_action.payload["data"]["status"] == "PAID"
    _confirm_ai_action(api_client, transaction_update_action)
    gateway_transaction.refresh_from_db()
    assert gateway_transaction.status == "PAID"
    assert gateway_transaction.gateway_response == "confirmado pelo gateway"

    _data, reconciliation_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere reconciliação de pagamento id {reconciliation.id} {{"confirmado":true}}',
        action_type="ai_crud_update",
    )

    assert reconciliation_update_action.payload["basename"] == "payments-reconciliation"
    assert reconciliation_update_action.payload["data"]["confirmed"] is True
    _confirm_ai_action(api_client, reconciliation_update_action)
    reconciliation.refresh_from_db()
    assert reconciliation.confirmed is True

    for model_name, obj in (
        ("reconciliação de pagamento", reconciliation),
        ("transação", gateway_transaction),
        ("recibo", receipt),
    ):
        _data, delete_action = _prepare_ai_crud_action(
            api_client,
            f"Remova {model_name} id {obj.id}",
            action_type="ai_crud_delete",
        )
        _confirm_ai_action(api_client, delete_action)

    assert not Reconciliation.objects.filter(id=reconciliation.id).exists()
    assert not Transaction.objects.filter(id=gateway_transaction.id).exists()
    assert not Receipt.objects.filter(id=receipt.id).exists()


@pytest.mark.django_db
def test_ai_payments_crud_denies_transaction_create_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-payments-denied", domain="tn-ai-payments-denied.local")
    user = _user(tenant, "recepcao_ai_payments_denied", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie transação {"referencia_externa":"TX-BLOCK-001","gateway":"mpesa","estado":"PENDING"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não" in data["answer"].lower()
    assert not [action for action in data["suggested_actions"] if action["action_type"].startswith("ai_crud_")]
    assert not Transaction.objects.filter(external_reference="TX-BLOCK-001").exists()


@pytest.mark.django_db
def test_ai_pharmacy_crud_creates_updates_and_deletes_stock_resources(api_client):
    tenant = _tenant(identifier="tn-ai-pharmacy-stock", domain="tn-ai-pharmacy-stock.local")
    user = _user(tenant, "farmacia_ai_stock", GROUPS["FARMACIA"])
    _authenticate(api_client, tenant, user)

    _data, product_action = _prepare_ai_crud_action(
        api_client,
        'Crie produto de farmácia {"nome":"Vitamina IA","tipo":"medicamento","preco_venda":"25.50","iva":"0.00","aplica_iva":false}',
    )

    assert product_action.payload["basename"] == "pharmacy-product"
    assert product_action.payload["data"]["type"] == Product.ProductType.MEDICAMENTO
    assert product_action.payload["data"]["sale_price"] == "25.50"
    assert product_action.payload["data"]["applies_vat_by_default"] is False
    _confirm_ai_action(api_client, product_action)
    product = Product.objects.get(tenant=tenant, name__icontains="Vitamina")

    _data, product_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere produto de farmácia código {product.custom_id} {{"preco_venda":"30.00","iva":"5.00"}}',
        action_type="ai_crud_update",
    )

    assert product_update_action.payload["basename"] == "pharmacy-product"
    assert product_update_action.payload["data"]["sale_price"] == "30.00"
    _confirm_ai_action(api_client, product_update_action)
    product.refresh_from_db()
    assert product.sale_price == Decimal("30.00")
    assert product.vat_percentage == Decimal("5.00")

    _data, lot_action = _prepare_ai_crud_action(
        api_client,
        (
            f'Crie lote de farmácia {{"produto":"{product.custom_id}","numero_lote":"LOT-CRUD-001",'
            '"validade":"2030-01-01","quantidade_inicial":12,"preco_venda":"30.00"}'
        ),
    )

    assert lot_action.payload["basename"] == "pharmacy-lot"
    assert lot_action.payload["data"]["product"] == product.id
    assert lot_action.payload["data"]["lot_number"] == "LOT-CRUD-001"
    _confirm_ai_action(api_client, lot_action)
    lot = Lot.objects.get(tenant=tenant, lot_number="LOT-CRUD-001")
    assert lot.balance() == 12
    assert InventoryMovement.objects.filter(tenant=tenant, lot=lot, type=MovementType.ENTRADA).exists()

    _data, movement_action = _prepare_ai_crud_action(
        api_client,
        'Crie movimento de estoque da farmácia {"lote":"LOT-CRUD-001","tipo":"entrada","origem":"ajuste","quantidade":3}',
    )

    assert movement_action.payload["basename"] == "pharmacy-movimentoestoque"
    assert movement_action.payload["data"]["lot"] == lot.id
    assert movement_action.payload["data"]["type"] == MovementType.ENTRADA
    assert movement_action.payload["data"]["origin"] == MovementOrigin.AJUSTE
    _confirm_ai_action(api_client, movement_action)
    movement = InventoryMovement.objects.filter(tenant=tenant, lot=lot, quantity=3).order_by("-id").first()
    assert movement is not None

    _data, movement_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere movimento de estoque da farmácia id {movement.id} {{"quantidade":4}}',
        action_type="ai_crud_update",
    )

    assert movement_update_action.payload["basename"] == "pharmacy-movimentoestoque"
    assert movement_update_action.payload["data"]["quantity"] == 4
    _confirm_ai_action(api_client, movement_update_action)
    movement.refresh_from_db()
    assert movement.quantity == 4

    for model_name, obj in (
        ("movimento de estoque da farmácia", movement),
        ("lote de farmácia", lot),
        ("produto de farmácia", product),
    ):
        _data, delete_action = _prepare_ai_crud_action(
            api_client,
            f"Remova {model_name} id {obj.id}",
            action_type="ai_crud_delete",
        )
        _confirm_ai_action(api_client, delete_action)

    assert InventoryMovement.all_objects.get(id=movement.id).deleted is True
    assert Lot.all_objects.get(id=lot.id).deleted is True
    assert Product.all_objects.get(id=product.id).deleted is True


@pytest.mark.django_db
def test_ai_pharmacy_crud_creates_sale_and_sale_item_with_fefo_stock(api_client):
    tenant = _tenant(identifier="tn-ai-pharmacy-sale", domain="tn-ai-pharmacy-sale.local")
    user = _user(tenant, "farmacia_ai_sale", GROUPS["FARMACIA"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Venda Farmácia IA")
    product, lot = _pharmacy_product_with_lot(tenant, name="Paracetamol IA", lot_number="LOT-SALE-001", quantity=20, price="10.00")
    _authenticate(api_client, tenant, user)

    _data, sale_action = _prepare_ai_crud_action(
        api_client,
        'Crie venda de farmácia {"numero":"SALE-AI-001","paciente":"Paciente Venda Farmácia IA","total":"0.00"}',
    )

    assert sale_action.payload["basename"] == "pharmacy-sale"
    assert sale_action.payload["data"]["patient"] == patient.id
    _confirm_ai_action(api_client, sale_action)
    sale = Sale.objects.get(tenant=tenant, number="SALE-AI-001")

    _data, item_action = _prepare_ai_crud_action(
        api_client,
        'Crie item de venda {"venda":"SALE-AI-001","produto":"Paracetamol IA","quantidade":2}',
    )

    assert item_action.payload["basename"] == "pharmacy-itemvenda"
    assert item_action.payload["data"]["sale"] == sale.id
    assert item_action.payload["data"]["product"] == product.id
    _confirm_ai_action(api_client, item_action)
    item = SaleItem.objects.get(tenant=tenant, sale=sale, product=product)
    sale.refresh_from_db()
    lot.refresh_from_db()
    assert item.unit_price == Decimal("10.00")
    assert sale.total == Decimal("20.00")
    assert lot.balance() == 18

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere item de venda id {item.id} {{"quantidade":3}}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "pharmacy-itemvenda"
    assert update_action.payload["data"]["quantity"] == 3
    _confirm_ai_action(api_client, update_action)
    item.refresh_from_db()
    sale.refresh_from_db()
    lot.refresh_from_db()
    assert item.quantity == 3
    assert sale.total == Decimal("30.00")
    assert lot.balance() == 17

    for model_name, obj in (("item de venda", item), ("venda de farmácia", sale)):
        _data, delete_action = _prepare_ai_crud_action(
            api_client,
            f"Remova {model_name} id {obj.id}",
            action_type="ai_crud_delete",
        )
        _confirm_ai_action(api_client, delete_action)

    assert SaleItem.all_objects.get(id=item.id).deleted is True
    assert Sale.all_objects.get(id=sale.id).deleted is True


@pytest.mark.django_db
def test_ai_pharmacy_crud_creates_material_requisition_with_nested_items(api_client):
    tenant = _tenant(identifier="tn-ai-pharmacy-requisition", domain="tn-ai-pharmacy-requisition.local")
    nurse = _user(tenant, "enfermagem_ai_pharmacy_request", GROUPS["ENFERMAGEM"])
    admin = _user(tenant, "admin_ai_pharmacy_request", GROUPS["ADMIN"], is_staff=True)
    _product, lot = _pharmacy_product_with_lot(tenant, name="Luvas IA", lot_number="REQLOT-AI-001", quantity=15, price="5.00")
    _other_product, other_lot = _pharmacy_product_with_lot(tenant, name="Seringa IA", lot_number="REQLOT-AI-002", quantity=15, price="2.00")
    _authenticate(api_client, tenant, nurse)

    _data, requisition_action = _prepare_ai_crud_action(
        api_client,
        'Crie requisição de material {"itens":[{"lote":"REQLOT-AI-001","quantidade_solicitada":4,"observacoes":"Uso em enfermaria"}]}',
    )

    assert requisition_action.payload["basename"] == "pharmacy-requisicaomaterial"
    assert requisition_action.payload["data"]["items_input"][0]["lote"] == "REQLOT-AI-001"
    _confirm_ai_action(api_client, requisition_action)
    requisition = MaterialRequisition.objects.get(tenant=tenant, sector=RequestingSector.ENFERMAGEM)
    item = requisition.items.get(lot=lot)
    assert requisition.status == MaterialRequisitionStatus.PENDING
    assert item.requested_quantity == 4
    assert item.notes == "Uso em enfermaria"

    _authenticate(api_client, tenant, admin)
    _data, item_action = _prepare_ai_crud_action(
        api_client,
        (
            f'Crie item de requisição de material {{"requisicao":"{requisition.custom_id}",'
            '"lote":"REQLOT-AI-002","quantidade_solicitada":2,"observacoes":"Complemento"}'
        ),
    )

    assert item_action.payload["basename"] == "pharmacy-requisicaomaterialitem"
    assert item_action.payload["data"]["requisition"] == requisition.id
    assert item_action.payload["data"]["lot"] == other_lot.id
    _confirm_ai_action(api_client, item_action)
    direct_item = MaterialRequisitionItem.objects.get(tenant=tenant, requisition=requisition, lot=other_lot)
    assert direct_item.requested_quantity == 2

    _data, item_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere item de requisição de material id {direct_item.id} {{"observacoes":"Complemento actualizado"}}',
        action_type="ai_crud_update",
    )

    assert item_update_action.payload["basename"] == "pharmacy-requisicaomaterialitem"
    assert item_update_action.payload["data"]["notes"] == "Complemento actualizado"
    _confirm_ai_action(api_client, item_update_action)
    direct_item.refresh_from_db()
    assert direct_item.notes == "Complemento actualizado"

    _data, item_delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova item de requisição de material id {direct_item.id}",
        action_type="ai_crud_delete",
    )

    assert item_delete_action.payload["basename"] == "pharmacy-requisicaomaterialitem"
    _confirm_ai_action(api_client, item_delete_action)
    assert MaterialRequisitionItem.all_objects.get(id=direct_item.id).deleted is True


@pytest.mark.django_db
def test_ai_pharmacy_crud_denies_product_create_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-pharmacy-denied", domain="tn-ai-pharmacy-denied.local")
    user = _user(tenant, "recepcao_ai_pharmacy_denied", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie produto de farmácia {"nome":"Bloqueado IA","tipo":"medicamento","preco_venda":"1.00"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem acesso" in data["answer"].lower()
    assert not [action for action in data["suggested_actions"] if action["action_type"].startswith("ai_crud_")]
    assert not Product.objects.filter(tenant=tenant, name__icontains="Bloqueado").exists()


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
def test_ai_insurer_crud_creates_all_insurer_resources_for_accounting_group(api_client):
    tenant = _tenant(identifier="tn-ai-insurer-crud", domain="tn-ai-insurer-crud.local")
    user = _user(tenant, "contabilidade_ai_insurer_crud", GROUPS["CONTABILIDADE"])
    _authenticate(api_client, tenant, user)

    _data, insurer_action = _prepare_ai_crud_action(
        api_client,
        'Crie seguradora {"name":"Seguro Global","external_code":"SEG-001","email":"seguradora@example.com","phone":"841234567","description":"Seguradora nacional","active":true}',
    )

    assert insurer_action.payload["basename"] == "insurer-insurer"
    assert insurer_action.payload["data"]["name"] == "Seguro Global"
    assert insurer_action.payload["data"]["external_code"] == "SEG-001"

    _confirm_ai_action(api_client, insurer_action)
    insurer = Insurer.objects.get(tenant=tenant, external_code="SEG-001")
    assert insurer.email == "seguradora@example.com"

    _data, plan_action = _prepare_ai_crud_action(
        api_client,
        'Crie plano de cobertura {"insurer":"SEG-001","name":"Plano Ouro IA","coverage_percentage":"80.00","requires_authorization":true,"active":true}',
    )

    assert plan_action.payload["basename"] == "insurer-planocobertura"
    assert plan_action.payload["data"]["insurer"] == insurer.id
    assert plan_action.payload["data"]["coverage_percentage"] == "80.00"

    _confirm_ai_action(api_client, plan_action)
    plan = CoveragePlan.objects.get(tenant=tenant, insurer=insurer)
    assert plan.requires_authorization is True

    _data, tenant_plan_action = _prepare_ai_crud_action(
        api_client,
        'Crie plano por tenant {"global_plan":"Plano Ouro IA","name":"Plano Ouro IA Local","override_percentage":"85.00","active":true}',
    )

    assert tenant_plan_action.payload["basename"] == "insurer-tenantplanocobertura"
    assert tenant_plan_action.payload["data"]["global_plan"] == plan.id
    assert tenant_plan_action.payload["data"]["override_percentage"] == "85.00"

    _confirm_ai_action(api_client, tenant_plan_action)
    tenant_plan = TenantCoveragePlan.objects.get(tenant=tenant, global_plan=plan)
    assert tenant_plan.override_percentage == Decimal("85.00")

    _data, authorization_action = _prepare_ai_crud_action(
        api_client,
        'Crie autorização de procedimento {"request_id":"REQ-INS-AI-001","plan":"Plano Ouro IA","status":"approved","authorization_code":"AUTH-INS-001","name":"Autorização IA"}',
    )

    assert authorization_action.payload["basename"] == "insurer-autorizacaoprocedimento"
    assert authorization_action.payload["data"]["plan"] == plan.id
    assert authorization_action.payload["data"]["status"] == ProcedureAuthorization.Status.APROVADA

    _confirm_ai_action(api_client, authorization_action)
    authorization = ProcedureAuthorization.objects.get(tenant=tenant, authorization_code="AUTH-INS-001")
    assert authorization.request_id == "REQ-INS-AI-001"

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova plano por tenant id {tenant_plan.id}",
        action_type="ai_crud_delete",
    )

    assert delete_action.payload["basename"] == "insurer-tenantplanocobertura"
    _confirm_ai_action(api_client, delete_action)
    assert TenantCoveragePlan.all_objects.get(id=tenant_plan.id).deleted is True


@pytest.mark.django_db
def test_ai_insurer_crud_updates_insurer_by_external_code_and_denies_reception(api_client):
    tenant = _tenant(identifier="tn-ai-insurer-update", domain="tn-ai-insurer-update.local")
    accounting_user = _user(tenant, "contabilidade_ai_insurer_update", GROUPS["CONTABILIDADE"])
    reception_user = _user(tenant, "recepcao_ai_insurer_denied", GROUPS["RECEPCAO"])
    insurer = Insurer.objects.create(
        tenant=tenant,
        name="Seguro Alterável",
        external_code="SEG-UPD-001",
        phone="840000000",
        active=True,
    )

    _authenticate(api_client, tenant, accounting_user)
    _data, update_action = _prepare_ai_crud_action(
        api_client,
        'Altere seguradora external_code SEG-UPD-001 {"phone":"849999999","active":false,"description":"Actualizada"}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "insurer-insurer"
    assert update_action.payload["object_ref"] == "SEG-UPD-001"
    assert update_action.payload["data"]["phone"] == "849999999"
    assert update_action.payload["data"]["active"] is False

    _confirm_ai_action(api_client, update_action)
    insurer.refresh_from_db()
    assert insurer.phone == "849999999"
    assert insurer.active is False
    assert insurer.description == "Actualizada"

    _authenticate(api_client, tenant, reception_user)
    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie seguradora {"name":"Bloqueada","external_code":"SEG-BLQ-001"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem acesso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not Insurer.objects.filter(tenant=tenant, external_code="SEG-BLQ-001").exists()


@pytest.mark.django_db
def test_ai_maternity_crud_creates_updates_and_deletes_pregnancy_for_medicine(api_client):
    tenant = _tenant(identifier="tn-ai-maternity-crud", domain="tn-ai-maternity-crud.local")
    user = _user(tenant, "medicina_ai_maternity_crud", GROUPS["MEDICINA"])
    patient = Patient.objects.create(
        tenant=tenant,
        name="Gestante IA",
        document_number="BI-MAT-001",
        pregnant=True,
    )
    doctor = Employee.objects.create(
        tenant=tenant,
        name="Dra Maternidade",
        document_number="CRM-MAT-001",
        email="dra.maternidade@example.com",
    )
    _authenticate(api_client, tenant, user)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        'Crie gestação {"paciente":"Gestante IA","medico_responsavel":"Dra Maternidade","dum":"2026-01-10","dpp":"2026-10-17","bercario":"Ala A","cama":"M-01","partos_totais":2,"partos_normais":1,"cesarianas":1,"estado":"acompanhamento","observacoes":"Pré-natal iniciado"}',
    )

    assert create_action.payload["basename"] == "maternity-gestacao"
    assert create_action.payload["data"]["patient"] == patient.id
    assert create_action.payload["data"]["responsible_doctor"] == doctor.id
    assert create_action.payload["data"]["status"] == Pregnancy.Status.FOLLOW_UP
    assert create_action.payload["data"]["maternity_bed"] == "M-01"

    _confirm_ai_action(api_client, create_action)
    pregnancy = Pregnancy.objects.get(tenant=tenant, patient=patient)
    assert pregnancy.responsible_doctor == doctor
    assert pregnancy.expected_delivery_date.isoformat() == "2026-10-17"
    assert pregnancy.total_deliveries == 2

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere gestação id {pregnancy.id} {{"estado":"parto","observacoes":"Parto realizado","cama":"M-02"}}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "maternity-gestacao"
    assert update_action.payload["object_ref"] == str(pregnancy.id)
    assert update_action.payload["data"]["status"] == Pregnancy.Status.DELIVERY
    assert update_action.payload["data"]["maternity_bed"] == "M-02"

    _confirm_ai_action(api_client, update_action)
    pregnancy.refresh_from_db()
    assert pregnancy.status == Pregnancy.Status.DELIVERY
    assert pregnancy.notes == "Parto realizado"
    assert pregnancy.maternity_bed == "M-02"

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova gestação id {pregnancy.id}",
        action_type="ai_crud_delete",
    )

    assert delete_action.payload["basename"] == "maternity-gestacao"
    _confirm_ai_action(api_client, delete_action)
    assert Pregnancy.all_objects.get(id=pregnancy.id).deleted is True


@pytest.mark.django_db
def test_ai_maternity_crud_denies_pregnancy_create_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-maternity-denied", domain="tn-ai-maternity-denied.local")
    user = _user(tenant, "recepcao_ai_maternity_denied", GROUPS["RECEPCAO"])
    Patient.objects.create(
        tenant=tenant,
        name="Gestante Bloqueada",
        document_number="BI-MAT-BLOCK",
        pregnant=True,
    )
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie gestação {"paciente":"Gestante Bloqueada","estado":"acompanhamento"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem acesso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not Pregnancy.objects.filter(tenant=tenant, patient__name="Gestante Bloqueada").exists()


@pytest.mark.django_db
def test_ai_surgery_crud_creates_catalog_procedure_and_surgery_for_medicine(api_client):
    tenant = _tenant(identifier="tn-ai-surgery-crud", domain="tn-ai-surgery-crud.local")
    user = _user(tenant, "medicina_ai_surgery_crud", GROUPS["MEDICINA"])
    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente Cirurgia IA",
        document_number="BI-SURG-001",
    )
    _authenticate(api_client, tenant, user)

    _data, procedure_action = _prepare_ai_crud_action(
        api_client,
        'Crie procedimento cirúrgico {"nome":"Apendicectomia IA","descricao":"Catálogo cirúrgico IA","preco_base":"2500.00","iva":"0.00","aplica_iva":false}',
    )

    assert procedure_action.payload["basename"] == "surgery-procedimentocirurgico"
    assert procedure_action.payload["data"]["name"] == "Apendicectomia IA"
    assert procedure_action.payload["data"]["base_price"] == "2500.00"
    assert procedure_action.payload["data"]["applies_vat_by_default"] is False
    _confirm_ai_action(api_client, procedure_action)
    procedure = SurgicalProcedure.objects.get(tenant=tenant, name__icontains="Apendicectomia")

    _data, procedure_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere procedimento cirúrgico código {procedure.custom_id} {{"descricao":"Catálogo actualizado","preco_base":"2750.00"}}',
        action_type="ai_crud_update",
    )

    assert procedure_update_action.payload["basename"] == "surgery-procedimentocirurgico"
    assert procedure_update_action.payload["data"]["description"] == "Catálogo actualizado"
    assert procedure_update_action.payload["data"]["base_price"] == "2750.00"
    _confirm_ai_action(api_client, procedure_update_action)
    procedure.refresh_from_db()
    assert procedure.description == "Catálogo actualizado"
    assert procedure.base_price == Decimal("2750.00")

    _data, surgery_action = _prepare_ai_crud_action(
        api_client,
        (
            'Crie cirurgia {"paciente":"Paciente Cirurgia IA","cirurgiao":"medicina_ai_surgery_crud",'
            '"procedimentos":["Apendicectomia IA"],"porte":"grande","estado":"agendada",'
            '"preco_estimado":"3200.00","iva":"0.00","data_cirurgia":"2026-07-15T09:30:00Z",'
            '"descricao":"Preparar sala cirúrgica"}'
        ),
    )

    assert surgery_action.payload["basename"] == "surgery-surgery"
    assert surgery_action.payload["data"]["patient"] == patient.id
    assert surgery_action.payload["data"]["surgeon"] == user.id
    assert surgery_action.payload["data"]["procedures"] == [procedure.id]
    assert surgery_action.payload["data"]["surgery_size"] == Surgery.Size.LARGE
    assert surgery_action.payload["data"]["status"] == Surgery.Status.SCHEDULED
    assert surgery_action.payload["data"]["estimated_price"] == "3200.00"
    _confirm_ai_action(api_client, surgery_action)
    surgery = Surgery.objects.get(tenant=tenant, patient=patient)
    assert surgery.surgeon == user
    assert surgery.procedure == procedure.name
    assert surgery.procedures.filter(id=procedure.id).exists()
    assert surgery.surgery_size == Surgery.Size.LARGE

    _data, surgery_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere cirurgia código {surgery.custom_id} {{"estado":"em andamento","preco_estimado":"3500.00","descricao":"Sala preparada"}}',
        action_type="ai_crud_update",
    )

    assert surgery_update_action.payload["basename"] == "surgery-surgery"
    assert surgery_update_action.payload["object_ref"] == surgery.custom_id
    assert surgery_update_action.payload["data"]["status"] == Surgery.Status.IN_PROGRESS
    assert surgery_update_action.payload["data"]["estimated_price"] == "3500.00"
    _confirm_ai_action(api_client, surgery_update_action)
    surgery.refresh_from_db()
    assert surgery.status == Surgery.Status.IN_PROGRESS
    assert surgery.estimated_price == Decimal("3500.00")
    assert surgery.description == "Sala preparada"

    _data, surgery_delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova cirurgia id {surgery.id}",
        action_type="ai_crud_delete",
    )

    assert surgery_delete_action.payload["basename"] == "surgery-surgery"
    _confirm_ai_action(api_client, surgery_delete_action)
    assert Surgery.all_objects.get(id=surgery.id).deleted is True

    _data, procedure_delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova procedimento cirúrgico id {procedure.id}",
        action_type="ai_crud_delete",
    )

    assert procedure_delete_action.payload["basename"] == "surgery-procedimentocirurgico"
    _confirm_ai_action(api_client, procedure_delete_action)
    assert SurgicalProcedure.all_objects.get(id=procedure.id).deleted is True


@pytest.mark.django_db
def test_ai_surgery_crud_creates_small_and_large_segmented_resources(api_client):
    tenant = _tenant(identifier="tn-ai-surgery-segmented", domain="tn-ai-surgery-segmented.local")
    user = _user(tenant, "medicina_ai_surgery_segmented", GROUPS["MEDICINA"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Cirurgia Segmentada", document_number="BI-SURG-002")
    _authenticate(api_client, tenant, user)

    _data, small_action = _prepare_ai_crud_action(
        api_client,
        'Crie pequena cirurgia {"paciente":"Paciente Cirurgia Segmentada","cirurgiao":"medicina_ai_surgery_segmented","procedimento":"Biópsia IA","estado":"agendada","preco_estimado":"800.00"}',
    )

    assert small_action.payload["basename"] == "surgery-pequenacirurgia"
    _confirm_ai_action(api_client, small_action)
    small = SmallSurgery.objects.get(tenant=tenant, procedure="Biópsia IA")
    assert small.surgery_size == Surgery.Size.SMALL

    _data, large_action = _prepare_ai_crud_action(
        api_client,
        'Crie grande cirurgia {"paciente":"Paciente Cirurgia Segmentada","cirurgiao":"medicina_ai_surgery_segmented","procedimento":"Laparotomia IA","estado":"agendada","preco_estimado":"4500.00"}',
    )

    assert large_action.payload["basename"] == "surgery-grandecirurgia"
    _confirm_ai_action(api_client, large_action)
    large = LargeSurgery.objects.get(tenant=tenant, procedure="Laparotomia IA")
    assert large.surgery_size == Surgery.Size.LARGE


@pytest.mark.django_db
def test_ai_surgery_crud_denies_surgery_create_for_nursing(api_client):
    tenant = _tenant(identifier="tn-ai-surgery-denied", domain="tn-ai-surgery-denied.local")
    user = _user(tenant, "enfermagem_ai_surgery_denied", GROUPS["ENFERMAGEM"])
    Patient.objects.create(tenant=tenant, name="Paciente Cirurgia Bloqueada", document_number="BI-SURG-BLOCK")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie cirurgia {"paciente":"Paciente Cirurgia Bloqueada","procedimento":"Bloqueado IA"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem acesso" in data["answer"].lower()
    assert not [action for action in data["suggested_actions"] if action["action_type"].startswith("ai_crud_")]
    assert not Surgery.objects.filter(tenant=tenant, patient__name="Paciente Cirurgia Bloqueada").exists()


@pytest.mark.django_db
def test_ai_tenants_crud_creates_updates_and_deletes_tenant_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-tenants-admin", domain="tn-ai-tenants-admin.local")
    admin = _user(tenant, "admin_ai_tenants_crud", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        (
            'Crie inquilino {"nome":"Hospital IA Tenant","identificador":"hospital-ia-tenant",'
            '"dominio":"hospital-ia.local","estado_comercial":"ativo","ativo":true,"trial_ate":"2026-12-31"}'
        ),
    )

    assert create_action.payload["basename"] == "tenants-tenant"
    assert create_action.payload["data"]["name"] == "Hospital IA Tenant"
    assert create_action.payload["data"]["identifier"] == "hospital-ia-tenant"
    assert create_action.payload["data"]["commercial_status"] == Tenant.CommercialStatus.ACTIVE
    _confirm_ai_action(api_client, create_action)
    managed_tenant = Tenant.objects.get(identifier="hospital-ia-tenant")
    assert managed_tenant.domain == "hospital-ia.local"
    assert managed_tenant.active is True

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        'Altere inquilino identificador hospital-ia-tenant {"estado_comercial":"suspenso","ativo":false}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "tenants-tenant"
    assert update_action.payload["object_ref"] == "hospital-ia-tenant"
    assert update_action.payload["data"]["commercial_status"] == Tenant.CommercialStatus.SUSPENDED
    assert update_action.payload["data"]["active"] is False
    _confirm_ai_action(api_client, update_action)
    managed_tenant.refresh_from_db()
    assert managed_tenant.commercial_status == Tenant.CommercialStatus.SUSPENDED
    assert managed_tenant.active is False

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        "Remova inquilino identificador hospital-ia-tenant",
        action_type="ai_crud_delete",
    )

    assert delete_action.payload["basename"] == "tenants-tenant"
    _confirm_ai_action(api_client, delete_action)
    assert Tenant.all_objects.get(id=managed_tenant.id).deleted is True


@pytest.mark.django_db
def test_ai_tenants_crud_manages_settings_flags_usage_and_plans_for_admin(api_client):
    tenant = _tenant(identifier="tn-ai-tenants-resources", domain="tn-ai-tenants-resources.local")
    admin = _user(tenant, "admin_ai_tenant_resources", GROUPS["ADMIN"], is_staff=True)
    _authenticate(api_client, tenant, admin)

    _data, config_action = _prepare_ai_crud_action(
        api_client,
        (
            'Crie configuração do inquilino {"fuso_horario":"Africa/Maputo","moeda":"MZN","idioma":"pt",'
            '"permite_multiunidade":true,"limite_utilizadores":25,"sobretaxa_feriado_consulta":"10.00"}'
        ),
    )

    assert config_action.payload["basename"] == "tenants-configuracaoinquilino"
    assert config_action.payload["data"]["time_zone"] == "Africa/Maputo"
    assert config_action.payload["data"]["allows_multi_unit"] is True
    assert config_action.payload["data"]["user_limit"] == 25
    _confirm_ai_action(api_client, config_action)
    config = TenantConfiguration.objects.get(tenant=tenant)
    assert config.holiday_consultation_percentage_surcharge == Decimal("10.00")

    _data, config_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere configuração do inquilino id {config.id} {{"limite_utilizadores":30,"idioma":"en"}}',
        action_type="ai_crud_update",
    )

    assert config_update_action.payload["basename"] == "tenants-configuracaoinquilino"
    assert config_update_action.payload["data"]["user_limit"] == 30
    _confirm_ai_action(api_client, config_update_action)
    config.refresh_from_db()
    assert config.user_limit == 30
    assert config.language == "en"

    _data, flag_action = _prepare_ai_crud_action(
        api_client,
        'Crie feature flag tenant {"chave":"ai-tenants-crud","ativo":true}',
    )

    assert flag_action.payload["basename"] == "tenants-featureflagtenant"
    assert flag_action.payload["data"]["key"] == "ai-tenants-crud"
    _confirm_ai_action(api_client, flag_action)
    flag = TenantFeatureFlag.objects.get(tenant=tenant, key="ai-tenants-crud")
    assert flag.active is True

    _data, flag_update_action = _prepare_ai_crud_action(
        api_client,
        'Altere feature flag chave ai-tenants-crud {"ativo":false}',
        action_type="ai_crud_update",
    )

    assert flag_update_action.payload["basename"] == "tenants-featureflagtenant"
    assert flag_update_action.payload["object_ref"] == "ai-tenants-crud"
    assert flag_update_action.payload["data"]["active"] is False
    _confirm_ai_action(api_client, flag_update_action)
    flag.refresh_from_db()
    assert flag.active is False

    _data, usage_action = _prepare_ai_crud_action(
        api_client,
        'Crie uso do tenant {"utilizadores_activos":7,"requisicoes_mes_actual":320}',
    )

    assert usage_action.payload["basename"] == "tenants-usotenant"
    assert usage_action.payload["data"]["active_users"] == 7
    assert usage_action.payload["data"]["current_month_requests"] == 320
    _confirm_ai_action(api_client, usage_action)
    usage = TenantUsage.objects.get(tenant=tenant)
    assert usage.active_users == 7

    _data, usage_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere uso do tenant id {usage.id} {{"utilizadores_activos":9,"requisicoes_mes_actual":400}}',
        action_type="ai_crud_update",
    )

    assert usage_update_action.payload["basename"] == "tenants-usotenant"
    assert usage_update_action.payload["data"]["active_users"] == 9
    _confirm_ai_action(api_client, usage_update_action)
    usage.refresh_from_db()
    assert usage.active_users == 9
    assert usage.current_month_requests == 400

    _data, plan_action = _prepare_ai_crud_action(
        api_client,
        (
            'Crie plano de assinatura {"nome":"Plano IA Tenants","descricao":"Plano de teste IA","tipo":"pro",'
            '"limite_utilizadores":100,"limite_requisicoes_mensais":5000,"preco_mensal":"1200.00",'
            '"preco_excedente_requisicao":"2.50","suporte_prioritario":true,"permite_multiunidade":true}'
        ),
    )

    assert plan_action.payload["basename"] == "tenants-planoassinatura"
    assert plan_action.payload["data"]["type"] == SubscriptionPlan.PlanType.PRO
    assert plan_action.payload["data"]["monthly_price"] == "1200.00"
    _confirm_ai_action(api_client, plan_action)
    plan = SubscriptionPlan.objects.get(name__icontains="Plano IA Tenants")
    assert plan.priority_support is True
    assert plan.allows_multi_unit is True

    _data, plan_update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere plano de assinatura código {plan.custom_id} {{"preco_mensal":"1500.00","limite_utilizadores":120}}',
        action_type="ai_crud_update",
    )

    assert plan_update_action.payload["basename"] == "tenants-planoassinatura"
    assert plan_update_action.payload["data"]["monthly_price"] == "1500.00"
    _confirm_ai_action(api_client, plan_update_action)
    plan.refresh_from_db()
    assert plan.monthly_price == Decimal("1500.00")
    assert plan.user_limit == 120

    for resource_name, obj in (
        ("feature flag", flag),
        ("uso do tenant", usage),
        ("configuração do inquilino", config),
        ("plano de assinatura", plan),
    ):
        _data, delete_action = _prepare_ai_crud_action(
            api_client,
            f"Remova {resource_name} id {obj.id}",
            action_type="ai_crud_delete",
        )
        _confirm_ai_action(api_client, delete_action)

    assert TenantFeatureFlag.all_objects.get(id=flag.id).deleted is True
    assert TenantUsage.all_objects.get(id=usage.id).deleted is True
    assert TenantConfiguration.all_objects.get(id=config.id).deleted is True
    assert SubscriptionPlan.objects.get(id=plan.id).deleted is True


@pytest.mark.django_db
def test_ai_tenants_crud_denies_tenant_create_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-tenants-denied", domain="tn-ai-tenants-denied.local")
    user = _user(tenant, "recepcao_ai_tenants_denied", GROUPS["RECEPCAO"])
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie inquilino {"nome":"Tenant Bloqueado IA","identificador":"tenant-bloqueado-ia"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem acesso" in data["answer"].lower()
    assert not [action for action in data["suggested_actions"] if action["action_type"].startswith("ai_crud_")]
    assert not Tenant.objects.filter(identifier="tenant-bloqueado-ia").exists()


@pytest.mark.django_db
def test_ai_medical_records_crud_creates_updates_and_deletes_record_for_medicine(api_client):
    tenant = _tenant(identifier="tn-ai-medical-record-crud", domain="tn-ai-medical-record-crud.local")
    user = _user(tenant, "medicina_ai_medical_record_crud", GROUPS["MEDICINA"])
    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente Cardex IA",
        document_number="BI-PRT-001",
    )
    doctor = Employee.objects.create(
        tenant=tenant,
        name="Dr Cardex",
        document_number="CRM-PRT-001",
        email="dr.cardex@example.com",
    )
    _authenticate(api_client, tenant, user)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        'Crie cardex {"paciente":"Paciente Cardex IA","medico":"Dr Cardex","estado":"rascunho","sintomas":"Febre e tosse","diagnostico":"Suspeita respiratória","prescricao":"Hidratação oral","relatorio_medico":"Avaliar em 48 horas"}',
    )

    assert create_action.payload["basename"] == "medical_records-record"
    assert create_action.payload["data"]["patient"] == patient.id
    assert create_action.payload["data"]["doctor"] == doctor.id
    assert create_action.payload["data"]["status"] == MedicalRecordEntry.Status.DRAFT
    assert create_action.payload["data"]["symptoms"] == "Febre e tosse"
    assert create_action.payload["data"]["diagnosis"] == "Suspeita respiratória"

    _confirm_ai_action(api_client, create_action)
    record = MedicalRecordEntry.objects.get(tenant=tenant, patient=patient)
    assert record.doctor == doctor
    assert record.medical_report == "Avaliar em 48 horas"

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere cardex id {record.id} {{"estado":"finalizado","diagnostico":"Bronquite aguda","relatorio":"Alta com orientação"}}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "medical_records-record"
    assert update_action.payload["object_ref"] == str(record.id)
    assert update_action.payload["data"]["status"] == MedicalRecordEntry.Status.FINALIZED
    assert update_action.payload["data"]["medical_report"] == "Alta com orientação"

    _confirm_ai_action(api_client, update_action)
    record.refresh_from_db()
    assert record.status == MedicalRecordEntry.Status.FINALIZED
    assert record.diagnosis == "Bronquite aguda"

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova cardex id {record.id}",
        action_type="ai_crud_delete",
    )

    assert delete_action.payload["basename"] == "medical_records-record"
    _confirm_ai_action(api_client, delete_action)
    assert MedicalRecordEntry.all_objects.get(id=record.id).deleted is True


@pytest.mark.django_db
def test_ai_medical_records_crud_creates_updates_and_deletes_prescription_item(api_client):
    tenant = _tenant(identifier="tn-ai-medical-record-prescription", domain="tn-ai-medical-record-prescription.local")
    user = _user(tenant, "medicina_ai_prescription_item_crud", GROUPS["MEDICINA"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Prescrição IA", document_number="BI-PRT-002")
    record = MedicalRecordEntry.objects.create(tenant=tenant, patient=patient, symptoms="Dor")
    medication = Product.objects.create(
        tenant=tenant,
        name="Amoxicilina IA",
        type=Product.ProductType.MEDICAMENTO,
        sale_price=Decimal("100.00"),
        vat_percentage=Decimal("0.00"),
    )
    _authenticate(api_client, tenant, user)

    _data, create_action = _prepare_ai_crud_action(
        api_client,
        f'Crie item de prescrição {{"cardex":{record.id},"medicamento":"Amoxicilina IA","dosagem":"500","unidade":"MG","numero_doses":6,"intervalo_horas":8,"observacoes":"Após refeições"}}',
    )

    assert create_action.payload["basename"] == "medical_records-prescricaoitem"
    assert create_action.payload["data"]["record"] == record.id
    assert create_action.payload["data"]["medication"] == medication.id
    assert create_action.payload["data"]["dosage_value"] == "500"
    assert create_action.payload["data"]["dosage_unit"] == PrescriptionItem.DosageUnit.MG
    assert create_action.payload["data"]["interval_hours"] == 8

    _confirm_ai_action(api_client, create_action)
    item = PrescriptionItem.objects.get(tenant=tenant, record=record, medication=medication)
    assert item.dosage_value == Decimal("500.00")
    assert item.dose_count == 6
    assert item.notes == "Após refeições"

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere item de prescrição id {item.id} {{"numero_doses":3,"intervalo_horas":12,"observacoes":"Reavaliar ao fim do tratamento"}}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "medical_records-prescricaoitem"
    assert update_action.payload["object_ref"] == str(item.id)
    assert update_action.payload["data"]["dose_count"] == 3
    assert update_action.payload["data"]["interval_hours"] == 12

    _confirm_ai_action(api_client, update_action)
    item.refresh_from_db()
    assert item.dose_count == 3
    assert item.interval_hours == 12
    assert item.notes == "Reavaliar ao fim do tratamento"

    _data, delete_action = _prepare_ai_crud_action(
        api_client,
        f"Remova item de prescrição id {item.id}",
        action_type="ai_crud_delete",
    )

    assert delete_action.payload["basename"] == "medical_records-prescricaoitem"
    _confirm_ai_action(api_client, delete_action)
    assert PrescriptionItem.all_objects.get(id=item.id).deleted is True


@pytest.mark.django_db
def test_ai_medical_records_crud_denies_record_create_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-medical-record-denied", domain="tn-ai-medical-record-denied.local")
    user = _user(tenant, "recepcao_ai_medical_record_denied", GROUPS["RECEPCAO"])
    Patient.objects.create(tenant=tenant, name="Paciente Cardex Bloqueado", document_number="BI-PRT-BLOCK")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie cardex {"paciente":"Paciente Cardex Bloqueado","sintomas":"Dor"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem acesso" in data["answer"].lower()
    assert not data["suggested_actions"]
    assert not MedicalRecordEntry.objects.filter(tenant=tenant, patient__name="Paciente Cardex Bloqueado").exists()


@pytest.mark.django_db
def test_ai_nursing_crud_creates_updates_and_deletes_clinical_records_for_nurse(api_client):
    tenant = _tenant(identifier="tn-ai-nursing-records", domain="tn-ai-nursing-records.local")
    user = _user(tenant, "enfermagem_ai_nursing_records", GROUPS["ENFERMAGEM"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Enfermagem IA", document_number="BI-NUR-001")
    _authenticate(api_client, tenant, user)

    _data, record_action = _prepare_ai_crud_action(
        api_client,
        'Crie registo de enfermagem {"nome":"Entrada IA","paciente":"Paciente Enfermagem IA","prioridade":"urgente","tipo":"manual","observacao":"Paciente em observação"}',
    )

    assert record_action.payload["basename"] == "nursing-registroenfermagem"
    assert record_action.payload["data"]["patient"] == patient.id
    assert record_action.payload["data"]["priority"] == NursingRecord.Prioridade.URGENTE
    assert record_action.payload["data"]["record_kind"] == NursingRecord.RecordKind.MANUAL

    _confirm_ai_action(api_client, record_action)
    record = NursingRecord.objects.get(tenant=tenant, patient=patient, name="Entrada Ia")
    assert record.observation == "Paciente em observação"

    _data, vital_action = _prepare_ai_crud_action(
        api_client,
        f'Crie sinal vital {{"nome":"Sinais IA","registo":{record.id},"paciente":"Paciente Enfermagem IA","temperatura":"37.5","pressao_arterial":"120/80","fc":88,"fr":18,"spo2":98}}',
    )

    assert vital_action.payload["basename"] == "nursing-sinalvitalenfermagem"
    assert vital_action.payload["data"]["record"] == record.id
    assert vital_action.payload["data"]["patient"] == patient.id
    assert vital_action.payload["data"]["heart_rate"] == 88

    _confirm_ai_action(api_client, vital_action)
    vital = NursingVitalSign.objects.get(tenant=tenant, record=record, name="Sinais Ia")
    assert vital.temperature_c == Decimal("37.5")
    assert vital.oxygen_saturation == 98

    _data, update_vital_action = _prepare_ai_crud_action(
        api_client,
        f'Altere sinal vital id {vital.id} {{"temperatura":"37.2","spo2":99}}',
        action_type="ai_crud_update",
    )

    assert update_vital_action.payload["basename"] == "nursing-sinalvitalenfermagem"
    assert update_vital_action.payload["object_ref"] == str(vital.id)
    assert update_vital_action.payload["data"]["oxygen_saturation"] == 99

    _confirm_ai_action(api_client, update_vital_action)
    vital.refresh_from_db()
    assert vital.temperature_c == Decimal("37.2")
    assert vital.oxygen_saturation == 99

    _data, prescription_action = _prepare_ai_crud_action(
        api_client,
        'Crie prescrição de enfermagem {"nome":"Cuidados IA","paciente":"Paciente Enfermagem IA","prescricao":"Hidratação oral","ativo":true}',
    )
    _data, evolution_action = _prepare_ai_crud_action(
        api_client,
        'Crie evolução de enfermagem {"nome":"Evolução IA","paciente":"Paciente Enfermagem IA","evolucao":"Paciente estável"}',
    )

    assert prescription_action.payload["basename"] == "nursing-prescricaoenfermagem"
    assert prescription_action.payload["data"]["patient"] == patient.id
    assert prescription_action.payload["data"]["description"] == "Hidratação oral"
    assert evolution_action.payload["basename"] == "nursing-evolucaoenfermagem"
    assert evolution_action.payload["data"]["observation"] == "Paciente estável"

    _confirm_ai_action(api_client, prescription_action)
    _confirm_ai_action(api_client, evolution_action)
    prescription = NursingPrescription.objects.get(tenant=tenant, patient=patient, name="Cuidados Ia")
    evolution = NursingEvolution.objects.get(tenant=tenant, patient=patient, name="Evolução Ia")

    for model_name, obj in (
        ("sinal vital", vital),
        ("prescrição de enfermagem", prescription),
        ("evolução de enfermagem", evolution),
        ("registo de enfermagem", record),
    ):
        _data, delete_action = _prepare_ai_crud_action(
            api_client,
            f"Remova {model_name} id {obj.id}",
            action_type="ai_crud_delete",
        )
        _confirm_ai_action(api_client, delete_action)

    assert NursingVitalSign.all_objects.get(id=vital.id).deleted is True
    assert NursingPrescription.all_objects.get(id=prescription.id).deleted is True
    assert NursingEvolution.all_objects.get(id=evolution.id).deleted is True
    assert NursingRecord.all_objects.get(id=record.id).deleted is True


@pytest.mark.django_db
def test_ai_nursing_crud_creates_ward_bed_and_admission_for_nurse(api_client):
    tenant = _tenant(identifier="tn-ai-nursing-ward", domain="tn-ai-nursing-ward.local")
    user = _user(tenant, "enfermagem_ai_nursing_ward", GROUPS["ENFERMAGEM"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Enfermaria IA", document_number="BI-WARD-001")
    _authenticate(api_client, tenant, user)

    _data, ward_action = _prepare_ai_crud_action(
        api_client,
        'Crie enfermaria {"nome":"Ala IA","descricao":"Internamento clínico","ativo":true}',
    )

    assert ward_action.payload["basename"] == "nursing-ward"
    assert ward_action.payload["data"]["name"] == "Ala IA"
    _confirm_ai_action(api_client, ward_action)
    ward = Ward.objects.get(tenant=tenant, name="Ala Ia")

    _data, bed_action = _prepare_ai_crud_action(
        api_client,
        'Crie cama de enfermaria {"enfermaria":"Ala IA","numero":"A-01","ativo":true}',
    )

    assert bed_action.payload["basename"] == "nursing-camaenfermaria"
    assert bed_action.payload["data"]["ward"] == ward.id
    assert bed_action.payload["data"]["number"] == "A-01"
    _confirm_ai_action(api_client, bed_action)
    bed = WardBed.objects.get(tenant=tenant, ward=ward, number="A-01")

    _data, admission_action = _prepare_ai_crud_action(
        api_client,
        'Crie internamento {"cama":"A-01","paciente":"Paciente Enfermaria IA","horas_observacao":24,"proxima_medicacao":"Soro às 18h","ativo":true,"observacoes":"Observação inicial"}',
    )

    assert admission_action.payload["basename"] == "nursing-internamentoenfermaria"
    assert admission_action.payload["data"]["bed"] == bed.id
    assert admission_action.payload["data"]["patient"] == patient.id
    assert admission_action.payload["data"]["estimated_observation_hours"] == 24

    _confirm_ai_action(api_client, admission_action)
    admission = WardAdmission.objects.get(tenant=tenant, bed=bed, patient=patient)
    assert admission.next_medication_description == "Soro às 18h"

    _data, update_action = _prepare_ai_crud_action(
        api_client,
        f'Altere internamento id {admission.id} {{"ativo":false,"observacoes":"Alta administrativa pela IA"}}',
        action_type="ai_crud_update",
    )

    assert update_action.payload["basename"] == "nursing-internamentoenfermaria"
    assert update_action.payload["data"]["active"] is False
    assert update_action.payload["data"]["notes"] == "Alta administrativa pela IA"
    _confirm_ai_action(api_client, update_action)
    admission.refresh_from_db()
    assert admission.active is False
    assert admission.notes == "Alta administrativa pela IA"

    for model_name, obj in (
        ("internamento", admission),
        ("cama de enfermaria", bed),
        ("enfermaria", ward),
    ):
        _data, delete_action = _prepare_ai_crud_action(
            api_client,
            f"Remova {model_name} id {obj.id}",
            action_type="ai_crud_delete",
        )
        _confirm_ai_action(api_client, delete_action)

    assert WardAdmission.all_objects.get(id=admission.id).deleted is True
    assert WardBed.all_objects.get(id=bed.id).deleted is True
    assert Ward.all_objects.get(id=ward.id).deleted is True


@pytest.mark.django_db
def test_ai_nursing_crud_prepares_catalog_procedure_and_items_for_nurse(api_client):
    tenant = _tenant(identifier="tn-ai-nursing-procedure", domain="tn-ai-nursing-procedure.local")
    user = _user(tenant, "enfermagem_ai_nursing_procedure", GROUPS["ENFERMAGEM"])
    patient = Patient.objects.create(tenant=tenant, name="Paciente Procedimento IA", document_number="BI-PROC-001")
    _authenticate(api_client, tenant, user)

    _data, catalog_action = _prepare_ai_crud_action(
        api_client,
        'Crie catálogo de procedimento {"nome":"Curativo IA","codigo_procedimento":"CUR-IA","descricao":"Curativo simples","preco_padrao":"150.00","duracao_estimada":20,"ativo":true}',
    )

    assert catalog_action.payload["basename"] == "nursing-procedimentocatalogo"
    assert catalog_action.payload["data"]["procedure_code"] == "CUR-IA"
    assert catalog_action.payload["data"]["default_price"] == "150.00"
    _confirm_ai_action(api_client, catalog_action)
    catalog = ProcedureCatalog.objects.get(tenant=tenant, procedure_code="CUR-IA")

    _data, procedure_action = _prepare_ai_crud_action(
        api_client,
        'Crie procedimento de enfermagem {"paciente":"Paciente Procedimento IA","estado":"marcado","estado_faturacao":"pendente","observacoes":"Procedimento solicitado","procedimentos_catalogo":["CUR-IA"]}',
    )

    assert procedure_action.payload["basename"] == "nursing-procedure"
    assert procedure_action.payload["data"]["patient"] == patient.id
    assert procedure_action.payload["data"]["workflow_status"] == Procedure.WorkflowStatus.REQUESTED
    assert procedure_action.payload["data"]["billing_status"] == Procedure.BillingStatus.PENDING
    assert procedure_action.payload["data"]["selected_catalogs"] == [catalog.id]
    _confirm_ai_action(api_client, procedure_action)
    procedure = Procedure.objects.get(tenant=tenant, patient=patient, notes="Procedimento solicitado")
    assert list(procedure.selected_catalogs.values_list("id", flat=True)) == [catalog.id]

    _data, item_action = _prepare_ai_crud_action(
        api_client,
        f'Crie item de procedimento {{"procedimento":{procedure.id},"catalogo":"CUR-IA","quantidade":2,"realizado":true,"estado_execucao":"pendente","observacao":"Aplicar técnica asséptica"}}',
    )

    assert item_action.payload["basename"] == "nursing-procedimentoitem"
    assert item_action.payload["data"]["procedure"] == procedure.id
    assert item_action.payload["data"]["catalog"] == catalog.id
    assert item_action.payload["data"]["execution_status"] == ProcedureItem.ExecutionStatus.PENDING
    _confirm_ai_action(api_client, item_action)
    item = ProcedureItem.objects.get(tenant=tenant, procedure=procedure, catalog=catalog)
    assert item.quantity == 2
    assert item.description == "Curativo Ia"

    _data, update_item_action = _prepare_ai_crud_action(
        api_client,
        f'Altere item de procedimento id {item.id} {{"estado_execucao":"executado","observacao":"Executado sem intercorrências"}}',
        action_type="ai_crud_update",
    )

    assert update_item_action.payload["basename"] == "nursing-procedimentoitem"
    assert update_item_action.payload["data"]["execution_status"] == ProcedureItem.ExecutionStatus.EXECUTED
    _confirm_ai_action(api_client, update_item_action)
    item.refresh_from_db()
    assert item.execution_status == ProcedureItem.ExecutionStatus.EXECUTED
    assert item.observation == "Executado sem intercorrências"

    for model_name, obj in (
        ("item de procedimento", item),
        ("procedimento de enfermagem", procedure),
        ("catálogo de procedimento", catalog),
    ):
        _data, delete_action = _prepare_ai_crud_action(
            api_client,
            f"Remova {model_name} id {obj.id}",
            action_type="ai_crud_delete",
        )
        _confirm_ai_action(api_client, delete_action)

    assert ProcedureItem.all_objects.get(id=item.id).deleted is True
    assert Procedure.all_objects.get(id=procedure.id).deleted is True
    assert ProcedureCatalog.all_objects.get(id=catalog.id).deleted is True


@pytest.mark.django_db
def test_ai_nursing_crud_denies_record_create_for_reception(api_client):
    tenant = _tenant(identifier="tn-ai-nursing-denied", domain="tn-ai-nursing-denied.local")
    user = _user(tenant, "recepcao_ai_nursing_denied", GROUPS["RECEPCAO"])
    Patient.objects.create(tenant=tenant, name="Paciente Nursing Bloqueado", document_number="BI-NUR-BLOCK")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": 'Crie registo de enfermagem {"nome":"Bloqueado IA","paciente":"Paciente Nursing Bloqueado","observacao":"Sem acesso"}',
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    data = _response_data(response)
    assert "não tem acesso" in data["answer"].lower()
    assert not [action for action in data["suggested_actions"] if action["action_type"].startswith("ai_crud_")]
    assert not NursingRecord.objects.filter(tenant=tenant, name__iexact="Bloqueado IA").exists()


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
    investigation_names = {tool.name for tool in registry.select_tools(message="quero investigar pacientes", active_module="ai")}
    sql_names = {tool.name for tool in registry.select_tools(message="qual era o estoque de medicação K no dia 2026-05-11", active_module="ai")}
    generic_sql_names = {
        tool.name
        for tool in registry.select_tools(message="quantos estudantes foram criados de 2026-05-01 a 2026-05-31", active_module="ai")
    }

    assert "get_user_context" in personal_names
    assert "explore_database" in data_names
    assert "get_lab_request_collection_guidance" in clinical_names
    assert "get_financial_operational_summary" in finance_names
    assert "prepare_operational_report" in report_names
    assert "prepare_operational_task" in task_names
    assert "get_education_summary" in education_names
    assert "explore_database" in investigation_names
    assert "prepare_operational_task" not in investigation_names
    assert "run_sql_analytics" in sql_names
    assert "run_sql_analytics" in generic_sql_names
