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
from apps.clinical.models.sample import Sample
from apps.reception.models.reception_checkin import ReceptionCheckin
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector


@pytest.mark.django_db
def test_reception_flow_billing_payment():
    tenant = Tenant.objects.create(identifier="tn-flow", name="Tenant Flow")

    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente Flow",
        gender="Masculino",
        address_street="Rua A",
        address_city="Maputo",
    )
    sample = Sample.objects.create(
        tenant=tenant,
        name="Sangue total",
        bottle_type=Sample.BottleType.EDTA_TUBE,
    )

    exam = LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("25.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        sample_type=sample,
    )

    checkin = open_checkin(
        tenant=tenant,
        patient=patient,
        priority=ReceptionCheckin.Priority.NORMAL,
    )

    request = create_request_for_checkin(
        checkin=checkin,
        exam_ids=[exam.id],
    )

    invoice = create_invoice_for_checkin(checkin=checkin, issue=True)

    payment, receipt = register_payment_for_checkin(
        checkin=checkin,
        value=invoice.total,
    )

    checkin.refresh_from_db()
    invoice.refresh_from_db()

    assert request.pk
    assert invoice.pk
    assert payment.pk
    assert receipt is not None
    assert invoice.status in {invoice.Status.ISSUED, invoice.Status.PAID}
    assert invoice.pagamentos.exists()
    assert invoice.recibos.exists()
    assert checkin.invoice_id == invoice.id
    assert checkin.request_id == request.id

