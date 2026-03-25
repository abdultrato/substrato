from decimal import Decimal

import pytest

from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.payments.models.payment import Payment
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector


def _tenant():
    return Tenant.objects.create(identifier="tn-hist", name="Tenant Historico")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Historico",
        gender="Masculino",
        address_street="Rua H",
    )


def _exam(tenant):
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma Historico",
        price=Decimal("25.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
    )


@pytest.mark.django_db
def test_invoice_history_registers_sync_issue_and_payment_events():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)

    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    LabRequestItem.objects.create(tenant=tenant, request=request, exam=exam)

    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        request=request,
        origin=Invoice.Origin.CLINICAL,
    )

    invoice.sync_items_from_origin()
    invoice.issue()

    payment = Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        value=invoice.total,
        method=Payment.Method.CASH,
    )
    payment.confirm()

    history = list(invoice.historico.order_by("created_at", "id").values_list("event_type", "description"))

    assert [event_type for event_type, _ in history] == [
        "SINCRONIZACAO",
        "EMISSAO",
        "PAGAMENTO",
    ]
    assert any("Total com IVA" in description for _, description in history)
    assert any("Estado de payment atualizado" in description for _, description in history)
