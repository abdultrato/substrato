from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.cotacoes.models import Quotation
from apps.cotacoes.services import QuotationWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-{suffix}",
        name="Tenant Cotações",
        domain=f"{suffix}.local",
        active=True,
    )


def _quotation_with_items(tenant, **overrides):
    fields = {
        "fiscal_client_name": "Empresa X",
        "issue_date": date.today(),
        "expiry_date": date.today() + timedelta(days=15),
    }
    fields.update(overrides)
    return QuotationWorkflowService.create_quotation(
        tenant=tenant,
        items=[
            {"description": "Serviço A", "quantity": Decimal("2"), "unit_price": Decimal("100.00")},
            {"description": "Serviço B", "quantity": Decimal("1"), "unit_price": Decimal("50.00")},
        ],
        **fields,
    )


@pytest.mark.django_db
def test_create_and_recalculate_totals():
    tenant = _tenant()
    q = _quotation_with_items(tenant)
    # 2*100 + 1*50 = 250
    assert q.subtotal == Decimal("250.00")
    assert q.grand_total == Decimal("250.00")
    assert q.status == Quotation.Status.DRAFT


@pytest.mark.django_db
def test_item_discount_and_tax_amounts():
    tenant = _tenant()
    q = QuotationWorkflowService.create_quotation(
        tenant=tenant,
        items=[
            {
                "description": "Com desconto e IVA",
                "quantity": Decimal("1"),
                "unit_price": Decimal("100.00"),
                "discount_rate": Decimal("10.00"),
                "tax_rate": Decimal("5.00"),
            }
        ],
    )
    # base = 100 - 10 = 90; iva = 14.40; total = 104.40
    assert q.discount_total == Decimal("10.00")
    assert q.tax_total == Decimal("14.40")
    assert q.grand_total == Decimal("104.40")


@pytest.mark.django_db
def test_deposit_percentage():
    tenant = _tenant()
    q = _quotation_with_items(
        tenant, deposit_type=Quotation.DepositType.PERCENTAGE, deposit_percentage=Decimal("40.00")
    )
    assert q.deposit_required == Decimal("100.00")  # 40% de 250
    assert q.balance_due == Decimal("150.00")


@pytest.mark.django_db
def test_deposit_fixed_capped_at_total():
    tenant = _tenant()
    q = _quotation_with_items(
        tenant, deposit_type=Quotation.DepositType.FIXED, deposit_fixed_amount=Decimal("9999.00")
    )
    assert q.deposit_required == Decimal("250.00")
    assert q.balance_due == Decimal("0.00")


@pytest.mark.django_db
def test_deposit_fixed_below_total_not_eroded():
    tenant = _tenant()
    q = _quotation_with_items(
        tenant, deposit_type=Quotation.DepositType.FIXED, deposit_fixed_amount=Decimal("80.00")
    )
    assert q.deposit_required == Decimal("80.00")
    assert q.balance_due == Decimal("170.00")


@pytest.mark.django_db
def test_sequential_number_per_year():
    tenant = _tenant()
    q1 = _quotation_with_items(tenant)
    q2 = _quotation_with_items(tenant)
    QuotationWorkflowService.send(q1)
    QuotationWorkflowService.send(q2)
    year = date.today().year
    assert q1.quotation_number == f"COT-{year}-000001"
    assert q2.quotation_number == f"COT-{year}-000002"


@pytest.mark.django_db
def test_send_requires_items():
    tenant = _tenant()
    q = QuotationWorkflowService.create_quotation(tenant=tenant, fiscal_client_name="Sem itens")
    with pytest.raises(ValidationError):
        QuotationWorkflowService.send(q)


@pytest.mark.django_db
def test_expiry_before_issue_invalid():
    tenant = _tenant()
    with pytest.raises(ValidationError):
        QuotationWorkflowService.create_quotation(
            tenant=tenant,
            issue_date=date.today(),
            expiry_date=date.today() - timedelta(days=1),
        )
