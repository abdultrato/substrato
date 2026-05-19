from decimal import Decimal
from types import SimpleNamespace

import pytest

from application.billing.commands import IssueInvoiceCommand
from application.billing.handlers import handle_issue_invoice
from application.payments.commands import (
    ReconcileTransactionCommand,
    RefundPaymentCommand,
    StartPaymentCommand,
)
from application.payments.handlers import (
    handle_reconcile_transaction,
    handle_refund_payment,
    handle_start_payment,
)
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.patient import Patient
from apps.payments.models.payment import Payment
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(identifier="tn-pay-cmd", name="Tenant Payments Command")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Payments Command",
        gender="Masculino",
        address_street="Rua Payments",
    )


def _issued_invoice(tenant):
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
        description="Ajuste pagamento",
        quantity=Decimal("1.00"),
        unit_price=Decimal("10.00"),
        applies_vat=False,
        vat_percentage=Decimal("0.00"),
    )
    return handle_issue_invoice(IssueInvoiceCommand(invoice=invoice, idempotent=True))


@pytest.mark.django_db
def test_start_payment_command_is_idempotent_by_reference(monkeypatch):
    calls = []

    class DummyGateway:
        name = "stripe"

        def charge(self, amount, reference, phone=None):
            calls.append((amount, reference, phone))
            return {"status": "processing", "transaction_id": "tx-1"}

    monkeypatch.setattr("application.payments.handlers.get_gateway", lambda name=None: DummyGateway())

    invoice_stub = SimpleNamespace(id=77)
    first = handle_start_payment(
        StartPaymentCommand(
            invoice=invoice_stub,
            value=Decimal("55.00"),
            gateway_name="stripe",
            idempotent=True,
        )
    )
    second = handle_start_payment(
        StartPaymentCommand(
            invoice=invoice_stub,
            value=Decimal("55.00"),
            gateway_name="stripe",
            idempotent=True,
        )
    )

    assert first.id == second.id
    assert Transaction.objects.count() == 1
    assert calls == [(Decimal("55.00"), "FAT-77", None)]


@pytest.mark.django_db
def test_reconcile_transaction_command_is_idempotent_and_confirms_reconciliation(monkeypatch):
    class DummyGateway:
        name = "stripe"

        def status(self, reference):
            return {"status": "confirmed", "reference": reference}

    monkeypatch.setattr("application.payments.handlers.get_gateway", lambda name=None: DummyGateway())

    transaction = Transaction.objects.create(
        external_reference="FAT-99",
        gateway="stripe",
        status="pending",
        gateway_response="",
    )

    first = handle_reconcile_transaction(
        ReconcileTransactionCommand(
            transaction=transaction,
            gateway_name="stripe",
            idempotent=True,
            confirm_when_paid=True,
        )
    )
    second = handle_reconcile_transaction(
        ReconcileTransactionCommand(
            transaction=first,
            gateway_name="stripe",
            idempotent=True,
            confirm_when_paid=True,
        )
    )

    reconciliation = Reconciliation.objects.get(transaction=transaction)

    assert first.id == second.id
    assert second.status == "confirmed"
    assert reconciliation.confirmed is True
    assert Reconciliation.objects.filter(transaction=transaction).count() == 1


@pytest.mark.django_db
def test_refund_payment_command_is_idempotent():
    tenant = _tenant()
    invoice = _issued_invoice(tenant)

    payment = Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        name="Pagamento refund",
        value=invoice.total,
        method=Payment.Method.CASH,
    )
    payment.confirm()

    first = handle_refund_payment(
        RefundPaymentCommand(
            payment=payment,
            idempotent=True,
        )
    )
    second = handle_refund_payment(
        RefundPaymentCommand(
            payment=first,
            idempotent=True,
        )
    )

    assert first.id == second.id
    assert second.status == Payment.Status.REFUNDED

