from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exames_medicos import ExameMedico
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.enfermagem.modelos import (
    Procedimento,
    ProcedimentoCatalogo,
    ProcedimentoCatalogoMaterial,
    ProcedimentoItem,
)
from aplicativos.farmacia.models.categoria_produto import CategoriaProduto
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.produto import Produto
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
        endereco_rua="Rua Y",
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

    req = RequisicaoAnalise.objects.create(
        inquilino=tenant,
        paciente=paciente,
        tipo=RequisicaoAnalise.Tipo.EXAME_MEDICO,
    )
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


@pytest.mark.django_db
def test_fatura_enfermagem_bloqueia_emissao_quando_material_sem_estoque_e_libera_apos_atualizacao():
    tenant = _tenant()
    paciente = _paciente(tenant)

    proc = Procedimento.objects.create(paciente=paciente)

    cat = CategoriaProduto.objects.create(inquilino=tenant, nome="Cat Mat", descricao="")
    produto = Produto.objects.create(
        inquilino=tenant,
        nome="Soro",
        tipo=Produto.TipoProduto.MATERIAL,
        preco_venda=Decimal("5.00"),
        categoria=cat,
    )

    catalogo = ProcedimentoCatalogo.objects.create(
        inquilino=tenant,
        nome="Soro IV",
        preco_padrao=Decimal("10.00"),
    )
    ProcedimentoCatalogoMaterial.objects.create(
        inquilino=tenant,
        catalogo=catalogo,
        produto=produto,
        quantidade_padrao=Decimal("1.00"),
        custo_unitario_padrao=Decimal("2.50"),
    )

    ProcedimentoItem.objects.create(
        inquilino=tenant,
        procedimento=proc,
        catalogo=catalogo,
        quantidade=1,
    )

    fatura = Fatura.objects.create(
        inquilino=tenant,
        origem=Fatura.Origem.ENFERMAGEM,
        procedimento=proc,
    )
    fatura.sincronizar_itens_da_origem()

    with pytest.raises(ValidationError) as exc:
        fatura.emitir()

    assert "Estoque insuficiente" in str(exc.value)
    assert "itens" in getattr(exc.value, "message_dict", {})

    lote = Lote.objects.create(
        inquilino=tenant,
        produto=produto,
        numero_lote="L999",
        validade=timezone.localdate() + timedelta(days=60),
        quantidade_inicial=10,
    )

    fatura.emitir()
    fatura.refresh_from_db()
    assert fatura.estado == Fatura.Estado.EMITIDA

    material = proc.materiais.get(produto=produto)
    material.refresh_from_db()
    assert material.lote_id == lote.id
    assert material.movimento_estoque_id is not None
