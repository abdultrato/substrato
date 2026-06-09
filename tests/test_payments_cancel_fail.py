from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from application.billing.commands import IssueInvoiceCommand
from application.billing.handlers import handle_issue_invoice
from application.payments.commands import CancelPaymentCommand, FailPaymentCommand
from application.payments.handlers import handle_cancel_payment, handle_fail_payment
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.patient import Patient
from apps.payments.models.payment import Payment
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-pay-{suffix}", name="Tenant Pay")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant, name="Paciente Pay", gender="Masculino", address_street="Rua Pay",
    )


def _pending_payment(tenant):
    invoice = Invoice.objects.create(tenant=tenant, patient=_patient(tenant), origin=Invoice.Origin.MIXED)
    InvoiceItem.objects.create(
        tenant=tenant, invoice=invoice, item_type=InvoiceItem.TipoItem.AJUSTE,
        description="Item", quantity=Decimal("1.00"), unit_price=Decimal("10.00"),
        applies_vat=False, vat_percentage=Decimal("0.00"),
    )
    handle_issue_invoice(IssueInvoiceCommand(invoice=invoice, idempotent=True))
    return Payment.objects.create(
        tenant=tenant, invoice=invoice, value=Decimal("10.00"),
        method=Payment.Method.CASH, status=Payment.Status.PENDING,
    )


@pytest.mark.django_db
def test_cancel_pending_payment_is_idempotent():
    tenant = _tenant()
    payment = _pending_payment(tenant)

    handle_cancel_payment(CancelPaymentCommand(payment=payment, idempotent=True))
    payment.refresh_from_db()
    assert payment.status == Payment.Status.CANCELED

    # Idempotente: repetir não lança.
    handle_cancel_payment(CancelPaymentCommand(payment=payment, idempotent=True))
    payment.refresh_from_db()
    assert payment.status == Payment.Status.CANCELED


@pytest.mark.django_db
def test_fail_pending_payment():
    tenant = _tenant()
    payment = _pending_payment(tenant)
    handle_fail_payment(FailPaymentCommand(payment=payment, idempotent=True))
    payment.refresh_from_db()
    assert payment.status == Payment.Status.FAILED


@pytest.mark.django_db
def test_cancel_rejected_when_not_pending():
    tenant = _tenant()
    payment = _pending_payment(tenant)
    handle_fail_payment(FailPaymentCommand(payment=payment, idempotent=True))
    payment.refresh_from_db()
    assert payment.status == Payment.Status.FAILED

    with pytest.raises(ValidationError):
        handle_cancel_payment(CancelPaymentCommand(payment=payment, idempotent=True))
