from decimal import Decimal

import pytest

from application.reception.care_flow import (
    create_invoice_for_checkin,
    create_request_for_checkin,
    open_checkin,
    register_payment_for_checkin,
)
from application.reception.commands import (
    CreateInvoiceForCheckinCommand,
    CreateRequestForCheckinCommand,
    RegisterPaymentForCheckinCommand,
)
from application.reception.handlers import (
    handle_create_invoice_for_checkin,
    handle_create_request_for_checkin,
    handle_register_payment_for_checkin,
)
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.patient import Patient
from apps.clinical.models.sample import Sample
from apps.reception.models.reception_checkin import ReceptionCheckin
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector


def _tenant():
    return Tenant.objects.create(identifier="tn-cmd", name="Tenant Command")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Command",
        gender="Masculino",
        address_street="Rua C",
        address_city="Maputo",
    )


def _exam(tenant):
    sample = Sample.objects.create(
        tenant=tenant,
        name="Sangue total",
        bottle_type=Sample.BottleType.EDTA_TUBE,
    )
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma CMD",
        price=Decimal("25.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        sample_type=sample,
    )


@pytest.mark.django_db
def test_create_request_command_idempotent_returns_existing_request():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    checkin = open_checkin(tenant=tenant, patient=patient, priority=ReceptionCheckin.Priority.NORMAL)
    created = create_request_for_checkin(checkin=checkin, exam_ids=[exam.id])

    returned = handle_create_request_for_checkin(
        CreateRequestForCheckinCommand(
            checkin=checkin,
            exam_ids=[exam.id],
            idempotent=True,
        )
    )

    assert returned.id == created.id


@pytest.mark.django_db
def test_create_invoice_command_idempotent_returns_existing_invoice():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    checkin = open_checkin(tenant=tenant, patient=patient, priority=ReceptionCheckin.Priority.NORMAL)
    create_request_for_checkin(checkin=checkin, exam_ids=[exam.id])
    created = create_invoice_for_checkin(checkin=checkin, issue=True)

    returned = handle_create_invoice_for_checkin(
        CreateInvoiceForCheckinCommand(
            checkin=checkin,
            issue=True,
            idempotent=True,
        )
    )

    assert returned.id == created.id


@pytest.mark.django_db
def test_register_payment_command_idempotent_by_external_reference():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    checkin = open_checkin(tenant=tenant, patient=patient, priority=ReceptionCheckin.Priority.NORMAL)
    create_request_for_checkin(checkin=checkin, exam_ids=[exam.id])
    invoice = create_invoice_for_checkin(checkin=checkin, issue=True)

    payment, _ = register_payment_for_checkin(
        checkin=checkin,
        value=invoice.total,
        external_reference="REF-IDEMP-001",
        confirm=True,
    )
    before_count = invoice.pagamentos.count()

    returned, _ = handle_register_payment_for_checkin(
        RegisterPaymentForCheckinCommand(
            checkin=checkin,
            value=invoice.total,
            external_reference="REF-IDEMP-001",
            confirm=True,
            idempotent=True,
        )
    )

    invoice.refresh_from_db()
    assert returned.id == payment.id
    assert invoice.pagamentos.count() == before_count

