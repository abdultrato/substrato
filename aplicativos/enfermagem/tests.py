from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.enfermagem.modelos import (
    EvolucaoEnfermagem,
    PrescricaoEnfermagem,
    Procedimento,
    ProcedimentoCatalogo,
    ProcedimentoCatalogoMaterial,
    ProcedimentoItem,
    ProcedimentoItemValor,
    ProcedimentoMaterial,
    ProcedimentoMaterialValor,
    RegistroEnfermagem,
    SinalVitalEnfermagem,
)
from aplicativos.farmacia.models.categoria_produto import CategoriaProduto
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.lote import Lote
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from nucleo.constantes.laboratorio.metodo import Metodo
from nucleo.constantes.laboratorio.setor import Setor


def _tenant():
    return Inquilino.objects.create(identificador="tn-enf", nome="Tenant Enf")


def _paciente(tenant):
    return Paciente.objects.create(
        inquilino=tenant,
        nome="Paciente",
        genero="Masculino",
        morada={"rua": "Rua X"},
    )


def _profissional(tenant):
    User = get_user_model()
    return User.objects.create_user(
        username="prof-enf",
        email="prof@enf.test",
        password="123456",
        nome="Prof Enf",
        inquilino=tenant,
    )


def _produto(tenant):
    cat = CategoriaProduto.objects.create(inquilino=tenant, nome="Cat", descricao="")
    return Produto.objects.create(
        inquilino=tenant,
        nome="Soro",
        tipo=Produto.TipoProduto.MATERIAL,
        preco_venda=Decimal("5.00"),
        categoria=cat,
    )


def _lote(produto):
    return Lote.objects.create(
        inquilino=produto.inquilino,
        produto=produto,
        numero_lote="L123",
        validade=date.today() + timedelta(days=90),
        quantidade_inicial=10,
    )


@pytest.mark.django_db
def test_evolucao_prescricao_propagam_inquilino():
    tenant = _tenant()
    paciente = _paciente(tenant)

    evo = EvolucaoEnfermagem.objects.create(paciente=paciente, observacao="Evolução")
    pre = PrescricaoEnfermagem.objects.create(paciente=paciente, descricao="Prescrição")

    assert evo.inquilino == tenant
    assert pre.inquilino == tenant


@pytest.mark.django_db
def test_procedimento_recalcula_totais_com_item_valor():
    tenant = _tenant()
    paciente = _paciente(tenant)
    prof = _profissional(tenant)

    proc = Procedimento.objects.create(paciente=paciente, profissional=prof)

    item = ProcedimentoItem.objects.create(
        procedimento=proc,
        inquilino=tenant,
        descricao="Curativo",
        quantidade=1,
        preco_unitario=Decimal("10.00"),
    )
    piv = getattr(item, "valor", None)
    if piv:
        piv.preco_unitario = Decimal("10.00")
        piv.save()
    else:
        ProcedimentoItemValor.objects.create(item=item, inquilino=tenant, preco_unitario=Decimal("10.00"))

    proc.recalcular_totais()
    proc.refresh_from_db()

    assert proc.subtotal_servicos == Decimal("10.00")
    assert proc.total == Decimal("10.00") or proc.total >= proc.subtotal_servicos


@pytest.mark.django_db
def test_procedimento_catalogo_material_propagacao():
    tenant = _tenant()
    catalogo = ProcedimentoCatalogo.objects.create(inquilino=tenant, nome="Curativo")
    produto = _produto(tenant)

    pcm = ProcedimentoCatalogoMaterial.objects.create(
        catalogo=catalogo,
        produto=produto,
        inquilino=tenant,
        quantidade_padrao=Decimal("1.0"),
        custo_unitario_padrao=Decimal("2.50"),
    )

    assert pcm.inquilino == tenant
    assert pcm.catalogo.inquilino == tenant


@pytest.mark.django_db
def test_procedimento_item_validacao_descricao_ou_catalogo():
    tenant = _tenant()
    paciente = _paciente(tenant)
    proc = Procedimento.objects.create(paciente=paciente)

    item = ProcedimentoItem(procedimento=proc, inquilino=tenant, quantidade=1, preco_unitario=Decimal("1.00"))
    with pytest.raises(ValidationError):
        item.full_clean()


@pytest.mark.django_db
def test_procedimento_material_total_linha_usa_valor():
    tenant = _tenant()
    paciente = _paciente(tenant)
    proc = Procedimento.objects.create(paciente=paciente)
    produto = _produto(tenant)
    lote = _lote(produto)

    material = ProcedimentoMaterial.objects.create(
        inquilino=tenant,
        procedimento=proc,
        produto=produto,
        lote=lote,
        quantidade=1,
        custo_unitario=Decimal("3.00"),
    )
    pmv = getattr(material, "valor", None)
    if pmv:
        pmv.custo_unitario = Decimal("3.00")
        pmv.save()
    else:
        ProcedimentoMaterialValor.objects.create(material=material, inquilino=tenant, custo_unitario=Decimal("3.00"))

    assert material.inquilino == tenant
    assert material.total_linha == Decimal("3.00")


@pytest.mark.django_db
def test_registro_e_sinal_vital():
    tenant = _tenant()
    paciente = _paciente(tenant)

    registro = RegistroEnfermagem.objects.create(paciente=paciente, inquilino=tenant, observacao="Obs")
    sv = SinalVitalEnfermagem.objects.create(registro=registro, inquilino=tenant, temperatura_c=Decimal("36.5"))

    assert registro.inquilino == tenant
    assert sv.inquilino == tenant
    assert sv.registro == registro


@pytest.mark.django_db
def test_procedimento_item_catalogo_cria_material_pendente_quando_sem_estoque():
    tenant = _tenant()
    paciente = _paciente(tenant)

    proc = Procedimento.objects.create(paciente=paciente)
    produto = _produto(tenant)

    catalogo = ProcedimentoCatalogo.objects.create(inquilino=tenant, nome="Curativo", preco_padrao=Decimal("10.00"))
    ProcedimentoCatalogoMaterial.objects.create(
        inquilino=tenant,
        catalogo=catalogo,
        produto=produto,
        quantidade_padrao=Decimal("1.00"),
        custo_unitario_padrao=Decimal("2.50"),
    )

    item = ProcedimentoItem.objects.create(
        inquilino=tenant,
        procedimento=proc,
        catalogo=catalogo,
        quantidade=1,
    )

    materiais = list(item.materiais_gerados.filter(deletado=False))
    assert len(materiais) == 1

    material = materiais[0]
    assert material.produto_id == produto.id
    assert material.lote_id is None
    assert material.movimento_estoque_id is None
