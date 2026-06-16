from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.billing.models.invoice import Invoice
from apps.cotacoes.models import Quotation, QuotationStatusHistory
from apps.cotacoes.services import QuotationWorkflowService
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


def _accepted(tenant):
    q = _quotation(tenant)
    QuotationWorkflowService.send(q)
    QuotationWorkflowService.accept(q)
    return q


@pytest.mark.django_db
def test_happy_path_draft_to_converted():
    tenant = _tenant()
    q = _accepted(tenant)
    invoice = QuotationWorkflowService.convert_to_invoice(q)
    q.refresh_from_db()
    assert q.status == Quotation.Status.CONVERTED
    assert q.converted_invoice_id == invoice.pk
    assert invoice.status == Invoice.Status.DRAFT
    assert invoice.origin == Invoice.Origin.MIXED
    assert invoice.items.count() == 1
    # Cliente fiscal copiado
    assert invoice.fiscal_client_name == "Cliente WF"


@pytest.mark.django_db
def test_status_history_is_recorded():
    tenant = _tenant()
    q = _accepted(tenant)
    events = list(QuotationStatusHistory.objects.filter(quotation=q).values_list("event_type", flat=True))
    assert "created" in events
    assert "sent" in events
    assert "accepted" in events


@pytest.mark.django_db
def test_invalid_transition_blocked():
    tenant = _tenant()
    q = _quotation(tenant)
    # DRAFT → ACCEPTED não é permitido
    with pytest.raises(ValidationError):
        QuotationWorkflowService.accept(q)


@pytest.mark.django_db
def test_rejected_cannot_convert():
    tenant = _tenant()
    q = _quotation(tenant)
    QuotationWorkflowService.send(q)
    QuotationWorkflowService.reject(q, reason="Preço alto")
    q.refresh_from_db()
    assert q.status == Quotation.Status.REJECTED
    assert q.rejection_reason == "Preço alto"
    with pytest.raises(ValidationError):
        QuotationWorkflowService.convert_to_invoice(q)


@pytest.mark.django_db
def test_convert_requires_accepted():
    tenant = _tenant()
    q = _quotation(tenant)
    QuotationWorkflowService.send(q)
    with pytest.raises(ValidationError):
        QuotationWorkflowService.convert_to_invoice(q)


@pytest.mark.django_db
def test_double_convert_blocked():
    tenant = _tenant()
    q = _accepted(tenant)
    QuotationWorkflowService.convert_to_invoice(q)
    q.refresh_from_db()
    with pytest.raises(ValidationError):
        QuotationWorkflowService.convert_to_invoice(q)


@pytest.mark.django_db
def test_locked_quotation_blocks_item_edit():
    tenant = _tenant()
    q = _accepted(tenant)
    with pytest.raises(ValidationError):
        QuotationWorkflowService.add_item(q, description="Novo", quantity=Decimal("1"), unit_price=Decimal("10"))


@pytest.mark.django_db
def test_cancel_from_draft():
    tenant = _tenant()
    q = _quotation(tenant)
    QuotationWorkflowService.cancel(q)
    q.refresh_from_db()
    assert q.status == Quotation.Status.CANCELLED


@pytest.mark.django_db
def test_expire_overdue():
    tenant = _tenant()
    q = _quotation(tenant)
    QuotationWorkflowService.send(q)
    # Usa o mesmo relógio do serviço (timezone) e uma margem para evitar borda da meia-noite.
    q.expiry_date = timezone.now().date() - timedelta(days=2)
    q.save(update_fields=["expiry_date"])
    count = QuotationWorkflowService.expire_overdue(tenant=tenant)
    q.refresh_from_db()
    assert count == 1
    assert q.status == Quotation.Status.EXPIRED


@pytest.mark.django_db
def test_duplicate_creates_new_draft():
    tenant = _tenant()
    q = _accepted(tenant)
    copy = QuotationWorkflowService.duplicate(q)
    assert copy.pk != q.pk
    assert copy.status == Quotation.Status.DRAFT
    assert copy.items.count() == q.items.count()
    assert copy.grand_total == q.grand_total
