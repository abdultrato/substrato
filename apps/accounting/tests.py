"""Testes básicos de contabilidade com comentários explicativos."""

from decimal import Decimal

import pytest

from apps.accounting.models.account import Account
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement
from apps.billing.models.invoice import Invoice
from apps.tenants.models.tenant import Tenant


def _tenant():
    """Helper para criar tenant de teste."""
    return Tenant.objects.create(identifier="tn-cont", name="Tenant Cont")


@pytest.mark.django_db
def test_account_criacao():
    """Garante criação de conta e tipo correto."""
    tenant = _tenant()
    account = Account.objects.create(
        tenant=tenant,
        name="Caixa",
        type=Account.Tipo.ATIVO,
    )
    assert account.pk
    assert account.type == Account.Tipo.ATIVO


@pytest.mark.django_db
def test_entry_balances_with_movements():
    """Confere débito e crédito gerados em movimentos legados."""
    tenant = _tenant()
    account_debit = Account.objects.create(tenant=tenant, name="Caixa", type=Account.Tipo.ATIVO)
    account_credit = Account.objects.create(tenant=tenant, name="Receita", type=Account.Tipo.RECEITA)

    entry = LegacyEntry.objects.create(tenant=tenant, description="Venda à vista")
    mov_debit = LegacyMovement.objects.create(
        tenant=tenant,
        entry=entry,
        account=account_debit,
        value=Decimal("100.00"),
        debit=True,
    )
    mov_credit = LegacyMovement.objects.create(
        tenant=tenant,
        entry=entry,
        account=account_credit,
        value=Decimal("100.00"),
        debit=False,
    )

    assert entry.movimentos.count() == 2
    assert mov_debit.debit == Decimal("100.00")
    assert mov_debit.credit == Decimal("0.00")
    assert mov_credit.credit == Decimal("100.00")
    assert mov_credit.debit == Decimal("0.00")


@pytest.mark.django_db
def test_financial_reconciliation_filters_by_invoice():
    """Valida cálculo de discrepância e status reconciled."""
    tenant = _tenant()
    account = Account.objects.create(tenant=tenant, name="Banco", type=Account.Tipo.ATIVO)
    entry = LegacyEntry.objects.create(tenant=tenant, description="Pagamento invoice")
    LegacyMovement.objects.create(
        tenant=tenant,
        entry=entry,
        account=account,
        value=Decimal("50.00"),
        debit=True,
    )
    invoice = Invoice.objects.create(tenant=tenant, origin=Invoice.Origin.CLINICAL)

    conciliacao = FinancialReconciliation.objects.create(
        tenant=tenant,
        invoice=invoice,
        accounting_value=Decimal("50.00"),
        received_amount=Decimal("0.00"),
    )

    assert conciliacao.pk
    assert conciliacao.reconciled is False
    assert conciliacao.discrepancy == Decimal("50.00")
