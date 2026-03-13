from decimal import Decimal

import pytest

from aplicativos.contabilidade.modelos.contas import Conta
from aplicativos.contabilidade.modelos.lancamento import Lancamento
from aplicativos.contabilidade.modelos.movimento import Movimento
from aplicativos.contabilidade.modelos.conciliacao import ConciliacaoFinanceira
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.faturamento.modelos.fatura import Fatura


def _tenant():
    return Inquilino.objects.create(identificador="tn-cont", nome="Tenant Cont")


@pytest.mark.django_db
def test_conta_criacao():
    tenant = _tenant()
    conta = Conta.objects.create(
        inquilino=tenant,
        nome="Caixa",
        tipo=Conta.Tipo.ATIVO,
    )
    assert conta.pk
    assert conta.tipo == Conta.Tipo.ATIVO


@pytest.mark.django_db
def test_lancamento_com_movimentos_balanca():
    tenant = _tenant()
    conta_debito = Conta.objects.create(inquilino=tenant, nome="Caixa", tipo=Conta.Tipo.ATIVO)
    conta_credito = Conta.objects.create(inquilino=tenant, nome="Receita", tipo=Conta.Tipo.RECEITA)

    lancamento = Lancamento.objects.create(inquilino=tenant, descricao="Venda à vista")
    mov_debito = Movimento.objects.create(
        inquilino=tenant,
        lancamento=lancamento,
        conta=conta_debito,
        valor=Decimal("100.00"),
        debito=True,
    )
    mov_credito = Movimento.objects.create(
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
def test_conciliacao_financeira_filtra_por_fatura():
    tenant = _tenant()
    conta = Conta.objects.create(inquilino=tenant, nome="Banco", tipo=Conta.Tipo.ATIVO)
    lancamento = Lancamento.objects.create(inquilino=tenant, descricao="Pagamento fatura")
    Movimento.objects.create(
        inquilino=tenant,
        lancamento=lancamento,
        conta=conta,
        valor=Decimal("50.00"),
        debito=True,
    )
    fatura = Fatura.objects.create(inquilino=tenant, origem=Fatura.Origem.CLINICO)

    conciliacao = ConciliacaoFinanceira.objects.create(
        inquilino=tenant,
        fatura=fatura,
        valor_contabil=Decimal("50.00"),
        valor_recebido=Decimal("0.00"),
    )

    assert conciliacao.pk
    assert conciliacao.conciliado is False
    assert conciliacao.divergencia == Decimal("50.00")
