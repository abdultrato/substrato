from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
import pytest

from application.billing.commands import (
    ConfirmPendingInvoicePaymentCommand,
    IssueInvoiceCommand,
)
from application.billing.handlers import (
    handle_confirm_pending_invoice_payment,
    handle_issue_invoice,
)
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.patient import Patient
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(identifier="tn-billing-cmd", name="Tenant Billing Command")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Billing Command",
        gender="Masculino",
        address_street="Rua Billing",
    )


def _invoice_with_single_item(tenant):
    patient = _patient(tenant)
    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.MIXED,
    )
    InvoiceItem.objects.create(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.AJUSTE,
        description="Ajuste comando",
        quantity=Decimal("1.00"),
        unit_price=Decimal("10.00"),
        applies_vat=False,
        vat_percentage=Decimal("0.00"),
    )
    invoice.refresh_from_db()
    return invoice


@pytest.mark.django_db
def test_issue_invoice_command_is_idempotent():
    tenant = _tenant()
    invoice = _invoice_with_single_item(tenant)

    first = handle_issue_invoice(
        IssueInvoiceCommand(
            invoice=invoice,
            idempotent=True,
        )
    )
    second = handle_issue_invoice(
        IssueInvoiceCommand(
            invoice=first,
            idempotent=True,
        )
    )

    assert first.id == second.id
    assert second.status == Invoice.Status.ISSUED


@pytest.mark.django_db
def test_confirm_pending_invoice_payment_command_is_idempotent():
    tenant = _tenant()
    invoice = _invoice_with_single_item(tenant)
    invoice = handle_issue_invoice(IssueInvoiceCommand(invoice=invoice, idempotent=True))

    Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        name="Pagamento comando",
        value=invoice.total,
        method=Payment.Method.CASH,
    )

    first = handle_confirm_pending_invoice_payment(
        ConfirmPendingInvoicePaymentCommand(
            invoice=invoice,
            idempotent=True,
        )
    )
    receipts_after_first = Receipt.objects.filter(invoice=invoice).count()

    second = handle_confirm_pending_invoice_payment(
        ConfirmPendingInvoicePaymentCommand(
            invoice=first,
            idempotent=True,
        )
    )

    assert second.id == first.id
    assert second.status == Invoice.Status.PAID
    assert receipts_after_first == 1
    assert Receipt.objects.filter(invoice=invoice).count() == 1


@pytest.mark.django_db
def test_confirm_pending_invoice_payment_command_raises_when_not_paid_and_no_pending():
    tenant = _tenant()
    invoice = _invoice_with_single_item(tenant)
    invoice = handle_issue_invoice(IssueInvoiceCommand(invoice=invoice, idempotent=True))

    with pytest.raises(DjangoValidationError):
        handle_confirm_pending_invoice_payment(
            ConfirmPendingInvoicePaymentCommand(
                invoice=invoice,
                idempotent=True,
            )
        )

