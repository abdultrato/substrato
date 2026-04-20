from decimal import Decimal

from django.contrib.auth import get_user_model
import pytest

from application.reception.care_flow import (
    create_invoice_for_checkin,
    create_request_for_checkin,
    get_care_summary,
    open_checkin,
    register_payment_for_checkin,
)
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.patient import Patient
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.reception.models.reception_checkin import ReceptionCheckin
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector


def _tenant():
    return Tenant.objects.create(identifier="tn-rec", name="Tenant Recepcao")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Rec",
        gender="Masculino",
        address_street="Rua R",
    )


def _exam(tenant):
    return LabExam.objects.create(
        tenant=tenant,
        name="Raio-X",
        price=Decimal("50.00"),
        method=Method.ENZIMATICO,
        sector=Sector.RADIOLOGIA if hasattr(Sector, "RADIOLOGIA") else Sector.HEMATOLOGIA,
    )


@pytest.mark.django_db
def test_checkin_basic_flow():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)

    checkin = open_checkin(tenant=tenant, patient=patient, priority=ReceptionCheckin.Priority.NORMAL)

    request = create_request_for_checkin(checkin=checkin, exam_ids=[exam.id])

    invoice = create_invoice_for_checkin(checkin=checkin, issue=True)

    payment, receipt = register_payment_for_checkin(checkin=checkin, value=Decimal("50.00"))

    checkin.refresh_from_db()
    invoice.refresh_from_db()

    assert checkin.request_id == request.id
    assert checkin.invoice_id == invoice.id
    assert payment.status in {payment.Status.CONFIRMED, payment.Status.PENDING}
    assert receipt is None or receipt.value == payment.value


@pytest.mark.django_db
def test_create_invoice_for_checkin_without_request_creates_draft_invoice():
    tenant = _tenant()
    patient = _patient(tenant)
    checkin = open_checkin(tenant=tenant, patient=patient, priority=ReceptionCheckin.Priority.NORMAL)

    invoice = create_invoice_for_checkin(checkin=checkin, issue=True)

    checkin.refresh_from_db()
    invoice.refresh_from_db()

    assert checkin.invoice_id == invoice.id
    assert invoice.request_id is None
    assert invoice.origin == invoice.Origin.MIXED
    assert invoice.status == invoice.Status.DRAFT


@pytest.mark.django_db
def test_care_summary_exposes_invoice_creator_department_and_item_sector():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    checkin = open_checkin(tenant=tenant, patient=patient, priority=ReceptionCheckin.Priority.NORMAL)
    create_request_for_checkin(checkin=checkin, exam_ids=[exam.id])
    invoice = create_invoice_for_checkin(checkin=checkin, issue=False)

    user_model = get_user_model()
    creator = user_model.objects.create_user(
        username="recepcao_teste",
        email="recepcao-teste@example.com",
        password="testpass123",
        tenant=tenant,
    )
    ProfessionalProfile.objects.create(
        user=creator,
        department="Recepção",
        role="Atendente",
    )

    invoice.created_by = creator
    invoice.save(update_fields=["created_by"])

    summary = get_care_summary(checkin)
    expected_sector = exam.get_sector_display() or str(exam.sector)

    assert summary["invoice"]["created_by_name"] == "recepcao_teste"
    assert summary["invoice"]["created_by_department"] == "Recepção"
    assert expected_sector in summary["invoice"]["billed_item_sectors"]
    assert summary["invoice"]["items"][0]["billed_sector"] == expected_sector
