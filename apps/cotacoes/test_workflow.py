from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.billing.models.invoice import Invoice
from apps.cotacoes.models import (
    ProformaHistory,
    ProformaInvoice,
    Quotation,
    QuotationStatusHistory,
)
from apps.cotacoes.services import ProformaWorkflowService, QuotationWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-{suffix}",
        name="Tenant WF Cotações",
        domain=f"{suffix}.local",
        active=True,
    )


def _quotation(tenant):
    return QuotationWorkflowService.create_quotation(
        tenant=tenant,
        fiscal_client_name="Cliente WF",
        fiscal_client_nuit="123456789",
        issue_date=date.today(),
        expiry_date=date.today() + timedelta(days=10),
        items=[{"description": "Serviço", "quantity": Decimal("1"), "unit_price": Decimal("500.00")}],
    )


def _accepted_quotation(tenant):
    q = _quotation(tenant)
    QuotationWorkflowService.send(q)
    QuotationWorkflowService.accept(q)
    return q


def _accepted_proforma(tenant):
    q = _accepted_quotation(tenant)
    proforma = QuotationWorkflowService.convert_to_proforma(q)
    ProformaWorkflowService.send(proforma)
    ProformaWorkflowService.accept(proforma)
    return proforma


# ── Cotação → Proforma ──────────────────────────────────────────────────
@pytest.mark.django_db
def test_quotation_converts_to_proforma():
    tenant = _tenant()
    q = _accepted_quotation(tenant)
    proforma = QuotationWorkflowService.convert_to_proforma(q)
    q.refresh_from_db()
    assert q.status == Quotation.Status.CONVERTED
    assert q.converted_proforma_id == proforma.pk
    assert proforma.status == ProformaInvoice.Status.DRAFT
    assert proforma.quotation_id == q.pk
    assert proforma.items.count() == 1
    assert proforma.grand_total == q.grand_total
    assert proforma.fiscal_client_name == "Cliente WF"


@pytest.mark.django_db
def test_convert_to_proforma_requires_accepted():
    tenant = _tenant()
    q = _quotation(tenant)
    QuotationWorkflowService.send(q)
    with pytest.raises(ValidationError):
        QuotationWorkflowService.convert_to_proforma(q)


@pytest.mark.django_db
def test_rejected_quotation_cannot_convert():
    tenant = _tenant()
    q = _quotation(tenant)
    QuotationWorkflowService.send(q)
    QuotationWorkflowService.reject(q, reason="Preço alto")
    q.refresh_from_db()
    assert q.rejection_reason == "Preço alto"
    with pytest.raises(ValidationError):
        QuotationWorkflowService.convert_to_proforma(q)


@pytest.mark.django_db
def test_double_convert_quotation_blocked():
    tenant = _tenant()
    q = _accepted_quotation(tenant)
    QuotationWorkflowService.convert_to_proforma(q)
    q.refresh_from_db()
    with pytest.raises(ValidationError):
        QuotationWorkflowService.convert_to_proforma(q)


@pytest.mark.django_db
def test_quotation_status_history_recorded():
    tenant = _tenant()
    q = _accepted_quotation(tenant)
    QuotationWorkflowService.convert_to_proforma(q)
    events = list(QuotationStatusHistory.objects.filter(quotation=q).values_list("event_type", flat=True))
    assert {"created", "sent", "accepted", "converted_to_proforma"} <= set(events)


# ── Proforma lifecycle ──────────────────────────────────────────────────
@pytest.mark.django_db
def test_proforma_sequential_number():
    tenant = _tenant()
    p1 = QuotationWorkflowService.convert_to_proforma(_accepted_quotation(tenant))
    p2 = QuotationWorkflowService.convert_to_proforma(_accepted_quotation(tenant))
    ProformaWorkflowService.send(p1)
    ProformaWorkflowService.send(p2)
    year = date.today().year
    assert p1.proforma_number == f"PRO-{year}-000001"
    assert p2.proforma_number == f"PRO-{year}-000002"


@pytest.mark.django_db
def test_proforma_invalid_transition_blocked():
    tenant = _tenant()
    proforma = QuotationWorkflowService.convert_to_proforma(_accepted_quotation(tenant))
    # DRAFT → ACCEPTED não é permitido
    with pytest.raises(ValidationError):
        ProformaWorkflowService.accept(proforma)


@pytest.mark.django_db
def test_proforma_locked_blocks_item_edit():
    tenant = _tenant()
    proforma = _accepted_proforma(tenant)
    with pytest.raises(ValidationError):
        ProformaWorkflowService.add_item(proforma, description="x", quantity=Decimal("1"), unit_price=Decimal("5"))


@pytest.mark.django_db
def test_proforma_expire_overdue():
    tenant = _tenant()
    proforma = QuotationWorkflowService.convert_to_proforma(_accepted_quotation(tenant))
    ProformaWorkflowService.send(proforma)
    proforma.expiry_date = timezone.now().date() - timedelta(days=2)
    proforma.save(update_fields=["expiry_date"])
    count = ProformaWorkflowService.expire_overdue(tenant=tenant)
    proforma.refresh_from_db()
    assert count == 1
    assert proforma.status == ProformaInvoice.Status.EXPIRED


# ── Proforma → Fatura emitida ───────────────────────────────────────────
@pytest.mark.django_db
def test_proforma_converts_to_issued_invoice():
    tenant = _tenant()
    proforma = _accepted_proforma(tenant)
    invoice = ProformaWorkflowService.convert_to_invoice(proforma)
    proforma.refresh_from_db()
    assert proforma.status == ProformaInvoice.Status.CONVERTED
    assert proforma.converted_invoice_id == invoice.pk
    assert invoice.status == Invoice.Status.ISSUED
    assert invoice.origin == Invoice.Origin.PROFORMA
    assert invoice.source_proforma_id == proforma.pk
    assert invoice.source_quotation_id == proforma.quotation_id
    assert invoice.items.count() == 1
    events = list(ProformaHistory.objects.filter(proforma=proforma).values_list("event_type", flat=True))
    assert {"created_from_quotation", "sent", "accepted", "converted_to_invoice"} <= set(events)


@pytest.mark.django_db
def test_proforma_convert_requires_accepted():
    tenant = _tenant()
    proforma = QuotationWorkflowService.convert_to_proforma(_accepted_quotation(tenant))
    ProformaWorkflowService.send(proforma)
    with pytest.raises(ValidationError):
        ProformaWorkflowService.convert_to_invoice(proforma)


@pytest.mark.django_db
def test_proforma_double_convert_blocked():
    tenant = _tenant()
    proforma = _accepted_proforma(tenant)
    ProformaWorkflowService.convert_to_invoice(proforma)
    proforma.refresh_from_db()
    with pytest.raises(ValidationError):
        ProformaWorkflowService.convert_to_invoice(proforma)


# ── Integração: pagamento → recibo (reutiliza fluxo da Invoice) ─────────
@pytest.mark.django_db
def test_full_chain_payment_generates_receipt():
    from apps.payments.models.payment import Payment
    from apps.payments.models.receipt import Receipt

    tenant = _tenant()
    proforma = _accepted_proforma(tenant)
    invoice = ProformaWorkflowService.convert_to_invoice(proforma)

    payment = Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        value=invoice.total_a_pagar,
        method=Payment.Method.CASH,
    )
    payment.confirm()
    invoice.refresh_from_db()
    assert invoice.status == Invoice.Status.PAID
    assert Receipt.objects.filter(invoice=invoice).exists()
