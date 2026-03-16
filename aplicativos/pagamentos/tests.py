from decimal import Decimal

from django.core.exceptions import ValidationError
import pytest

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.pagamentos.modelos.reconciliacao import Reconciliacao
from aplicativos.pagamentos.modelos.transacao import Transacao
from nucleo.constantes.laboratorio.metodo import Metodo
from nucleo.constantes.laboratorio.setor import Setor


def _tenant():
    return Inquilino.objects.create(identificador="tn-pay", nome="Tenant Pay")


def _paciente(tenant):
    return Paciente.objects.create(
        inquilino=tenant,
        nome="Paciente Pay",
        genero="Masculino",
        morada={"rua": "Rua P"},
    )


def _exame(tenant):
    return Exame.objects.create(
        inquilino=tenant,
        nome="Glicose",
        preco=Decimal("20.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.BIOQUIMICA,
    )


def _fatura_com_exame(tenant, paciente, exame):
    req = RequisicaoAnalise.objects.create(inquilino=tenant, paciente=paciente)
    RequisicaoItem.objects.create(inquilino=tenant, requisicao=req, exame=exame)
    fat = Fatura.objects.create(
        inquilino=tenant,
        paciente=paciente,
        requisicao=req,
        origem=Fatura.Origem.CLINICO,
    )
    item = FaturaItem.objects.create(
        inquilino=tenant,
        fatura=fat,
        tipo_item=FaturaItem.TipoItem.EXAME,
        exame=exame,
    )
    item._preencher_de_referencia()
    item.save(update_fields=["descricao", "preco_unitario", "quantidade"])
    fat.persistir_totais()
    return fat


@pytest.mark.django_db
def test_pagamento_confirma_gera_recibo():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    fatura = _fatura_com_exame(tenant, paciente, exame)

    # Emite fatura para permitir atualização de estado/pagamento
    fatura.estado = Fatura.Estado.EMITIDA
    fatura.save(update_fields=["estado"])

    pagamento = Pagamento.objects.create(
        inquilino=tenant,
        fatura=fatura,
        valor=fatura.total,
        metodo=Pagamento.Metodo.DINHEIRO,
    )

    pagamento.confirmar()
    fatura.refresh_from_db()
    fatura.gerar_recibo_automatico(pagamento)

    fatura.refresh_from_db()
    recibo = Recibo.objects.filter(pagamento=pagamento).first()

    assert pagamento.status == Pagamento.Status.CONFIRMADO
    assert pagamento.pago_em is not None
    assert recibo is not None
    assert recibo.fatura == fatura
    assert fatura.estado in {Fatura.Estado.EMITIDA, Fatura.Estado.PAGA}


@pytest.mark.django_db
def test_pagamento_estorno_exige_confirmado():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    fatura = _fatura_com_exame(tenant, paciente, exame)

    pagamento = Pagamento.objects.create(
        inquilino=tenant,
        fatura=fatura,
        valor=fatura.total,
        metodo=Pagamento.Metodo.DINHEIRO,
    )

    with pytest.raises(ValidationError):
        pagamento.estornar()

    pagamento.confirmar()
    pagamento.estornar()
    assert pagamento.status == Pagamento.Status.ESTORNADO


@pytest.mark.django_db
def test_transacao_e_reconciliacao():
    trans = Transacao.objects.create(
        referencia_externa="TX123",
        gateway="local",
        status="PEN",
    )
    rec = Reconciliacao.objects.create(transacao=trans)
    rec.confirmar()
    rec.refresh_from_db()
    assert rec.confirmado is True
    assert rec.data_confirmacao is not None
