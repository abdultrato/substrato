from decimal import Decimal

import pytest

from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.account import Account
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement
from apps.billing.models.invoice import Invoice
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(identificador="tn-cont", nome="Tenant Cont")


@pytest.mark.django_db
def test_conta_criacao():
    tenant = _tenant()
    conta = Account.objects.create(
        inquilino=tenant,
        nome="Caixa",
        tipo=Account.Tipo.ATIVO,
    )
    assert conta.pk
    assert conta.tipo == Account.Tipo.ATIVO


@pytest.mark.django_db
def test_entry_balances_with_movements():
    tenant = _tenant()
    conta_debito = Account.objects.create(inquilino=tenant, nome="Caixa", tipo=Account.Tipo.ATIVO)
    conta_credito = Account.objects.create(inquilino=tenant, nome="Receita", tipo=Account.Tipo.RECEITA)

    lancamento = LegacyEntry.objects.create(inquilino=tenant, descricao="Venda à vista")
    mov_debito = LegacyMovement.objects.create(
        inquilino=tenant,
        lancamento=lancamento,
        conta=conta_debito,
        valor=Decimal("100.00"),
        debito=True,
    )
    mov_credito = LegacyMovement.objects.create(
        inquilino=tenant,
        lancamento=lancamento,
        conta=conta_credito,
        valor=Decimal("100.00"),
        debito=False,
    )

    assert lancamento.movimentos.count() == 2
    assert mov_debito.debito == Decimal("100.00")
    assert mov_debito.credito == Decimal("0.00")
    assert mov_credito.credito == Decimal("100.00")
    assert mov_credito.debito == Decimal("0.00")


@pytest.mark.django_db
def test_financial_reconciliation_filters_by_invoice():
    tenant = _tenant()
    conta = Account.objects.create(inquilino=tenant, nome="Banco", tipo=Account.Tipo.ATIVO)
    lancamento = LegacyEntry.objects.create(inquilino=tenant, descricao="Pagamento fatura")
    LegacyMovement.objects.create(
        inquilino=tenant,
        lancamento=lancamento,
        conta=conta,
        valor=Decimal("50.00"),
        debito=True,
    )
    fatura = Invoice.objects.create(inquilino=tenant, origem=Invoice.Origem.CLINICO)

    conciliacao = FinancialReconciliation.objects.create(
        inquilino=tenant,
        fatura=fatura,
        valor_contabil=Decimal("50.00"),
        valor_recebido=Decimal("0.00"),
    )

    assert conciliacao.pk
    assert conciliacao.conciliado is False
    assert conciliacao.divergencia == Decimal("50.00")
