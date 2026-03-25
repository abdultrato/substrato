from decimal import Decimal

import pytest

from application.reception.care_flow import (
    create_invoice_for_checkin,
    create_request_for_checkin,
    open_checkin,
    register_payment_for_checkin,
)
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.patient import Patient
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
    assert payment.status in {payment.Status.CONFIRMADO, payment.Status.PENDENTE}
    assert receipt is None or receipt.value == payment.value
