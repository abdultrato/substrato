from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exames_medicos import ExameMedico
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from nucleo.constantes.laboratorio.metodo import Metodo
from nucleo.constantes.laboratorio.setor import Setor


def _tenant():
    return Inquilino.objects.create(identificador="tn-fat", nome="Tenant Fat")


def _paciente(tenant):
    return Paciente.objects.create(
        inquilino=tenant,
        nome="Paciente Fat",
        genero="Masculino",
        morada={"rua": "Rua Y"},
    )


def _exame(tenant):
    return Exame.objects.create(
        inquilino=tenant,
        nome="Hemograma",
        preco=Decimal("30.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.HEMATOLOGIA,
    )


def _exame_medico(tenant):
    return ExameMedico.objects.create(
        inquilino=tenant,
        nome="Ecografia abdominal",
        preco=Decimal("150.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.IMUNOLOGIA,
    )


@pytest.mark.django_db
def test_fatura_clinico_recalcula_totais():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    req = RequisicaoAnalise.objects.create(inquilino=tenant, paciente=paciente)
    RequisicaoItem.objects.create(inquilino=tenant, requisicao=req, exame=exame)

    fatura = Fatura.objects.create(
        inquilino=tenant,
        paciente=paciente,
        requisicao=req,
        origem=Fatura.Origem.CLINICO,
    )

    item = FaturaItem.objects.create(
        inquilino=tenant,
        fatura=fatura,
        tipo_item=FaturaItem.TipoItem.EXAME,
        exame=exame,
    )
    item._preencher_de_referencia()
    item.save(update_fields=["descricao", "preco_unitario", "quantidade"])

    fatura.persistir_totais()
    fatura.refresh_from_db()

    assert fatura.subtotal == exame.preco
    assert fatura.total == fatura.subtotal + fatura.iva_valor
    assert fatura.valor_paciente == fatura.total


@pytest.mark.django_db
def test_fatura_clinico_sincroniza_exame_medico():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame_medico = _exame_medico(tenant)

    req = RequisicaoAnalise.objects.create(inquilino=tenant, paciente=paciente)
    RequisicaoItem.objects.create(
        inquilino=tenant,
        requisicao=req,
        exame_medico=exame_medico,
    )

    fatura = Fatura.objects.create(
        inquilino=tenant,
        paciente=paciente,
        requisicao=req,
        origem=Fatura.Origem.CLINICO,
    )

    fatura.sincronizar_itens_da_origem()
    fatura.refresh_from_db()

    itens = list(fatura.itens.filter(deletado=False))
    assert len(itens) == 1

    item = itens[0]
    assert item.tipo_item == FaturaItem.TipoItem.EXAME_MEDICO
    assert item.exame_medico_id == exame_medico.id
    assert item.exame_id is None
    assert item.descricao == exame_medico.nome
    assert item.preco_unitario == exame_medico.preco
    assert fatura.subtotal == exame_medico.preco


@pytest.mark.django_db
def test_item_ajuste_manual_requer_descricao():
    tenant = _tenant()
    paciente = _paciente(tenant)
    fatura = Fatura.objects.create(inquilino=tenant, paciente=paciente, origem=Fatura.Origem.CLINICO)

    item = FaturaItem(
        inquilino=tenant,
        fatura=fatura,
        tipo_item=FaturaItem.TipoItem.AJUSTE,
        quantidade=Decimal("1.00"),
        preco_unitario=Decimal("5.00"),
        descricao="",
    )
    with pytest.raises(ValidationError):
        item.full_clean()


@pytest.mark.django_db
def test_item_exame_origem_incompativel():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    fatura = Fatura.objects.create(inquilino=tenant, paciente=paciente, origem=Fatura.Origem.FARMACIA)

    item = FaturaItem(
        inquilino=tenant,
        fatura=fatura,
        tipo_item=FaturaItem.TipoItem.EXAME,
        exame=exame,
        quantidade=Decimal("1.00"),
        preco_unitario=exame.preco,
    )
    with pytest.raises(ValidationError):
        item.full_clean()
