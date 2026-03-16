from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.farmacia.models.categoria_produto import CategoriaProduto
from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.movimento import MovimentoEstoque, OrigemMovimento, TipoMovimento
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.venda import Venda
from aplicativos.inquilinos.modelos.inquilino import Inquilino


def _tenant():
    return Inquilino.objects.create(identificador="tn-far", nome="Tenant Farmacia")


def _produto(tenant):
    cat = CategoriaProduto.objects.create(inquilino=tenant, nome="Categoria", descricao="")
    return Produto.objects.create(
        inquilino=tenant,
        nome="Medicamento X",
        tipo=Produto.TipoProduto.MEDICAMENTO,
        preco_venda=Decimal("10.00"),
        categoria=cat,
    )


def _lote(produto, validade_days=30, quantidade=10):
    return Lote.objects.create(
        inquilino=produto.inquilino,
        produto=produto,
        numero_lote="L001",
        validade=timezone.localdate() + timedelta(days=validade_days),
        quantidade_inicial=quantidade,
    )


@pytest.mark.django_db
def test_produto_campos_obrigatorios():
    tenant = _tenant()
    produto = _produto(tenant)
    assert produto.inquilino == tenant
    assert produto.preco_venda > 0


@pytest.mark.django_db
def test_lote_imutavel_numero_e_quantidade():
    tenant = _tenant()
    prod = _produto(tenant)
    lote = _lote(prod, quantidade=5)

    with pytest.raises(ValidationError):
        lote.quantidade_inicial = 10
        lote.save()
    with pytest.raises(ValidationError):
        lote.numero_lote = "L002"
        lote.save()


@pytest.mark.django_db
def test_movimento_estoque_saida_reduz_lote():
    tenant = _tenant()
    prod = _produto(tenant)
    lote = _lote(prod, quantidade=5)

    venda = Venda.objects.create(inquilino=tenant, numero="V001", total=Decimal("0"))
    item = ItemVenda.objects.create(
        inquilino=tenant, venda=venda, produto=prod, quantidade=2, preco_unitario=Decimal("10.00")
    )
    mov = MovimentoEstoque.objects.create(
        inquilino=tenant,
        lote=lote,
        tipo=TipoMovimento.SAIDA,
        origem=OrigemMovimento.VENDA,
        item_venda=item,
        quantidade=2,
    )

    assert mov.pk
    assert mov.tipo == TipoMovimento.SAIDA


@pytest.mark.django_db
def test_venda_itens_e_total():
    tenant = _tenant()
    Paciente.objects.create(inquilino=tenant, nome="Cliente", genero="Masculino", endereco_rua="Rua Z")
    prod = _produto(tenant)
    _lote(prod, quantidade=10)

    venda = Venda.objects.create(inquilino=tenant, numero="V002", total=Decimal("0.00"))
    item = ItemVenda.objects.create(
        inquilino=tenant,
        venda=venda,
        produto=prod,
        quantidade=2,
        preco_unitario=Decimal("10.00"),
    )

    assert venda.itens.count() == 1
    assert item.total_linha == Decimal("20.00")
    venda.refresh_from_db()
    item.atualizar_total_venda()
    venda.refresh_from_db()
    assert venda.total == Decimal("20.00")
