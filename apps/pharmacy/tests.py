from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.pharmacy.models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(identificador="tn-far", nome="Tenant Farmacia")


def _product(tenant):
    cat = ProductCategory.objects.create(inquilino=tenant, nome="Categoria", descricao="")
    return Product.objects.create(
        inquilino=tenant,
        nome="Medicamento X",
        tipo=Product.ProductType.MEDICAMENTO,
        preco_venda=Decimal("10.00"),
        categoria=cat,
    )


def _lote(produto, validade_days=30, quantidade=10):
    return Lot.objects.create(
        inquilino=produto.inquilino,
        produto=produto,
        numero_lote="L001",
        validade=timezone.localdate() + timedelta(days=validade_days),
        quantidade_inicial=quantidade,
    )


@pytest.mark.django_db
def test_product_required_fields():
    tenant = _tenant()
    product = _product(tenant)
    assert product.inquilino == tenant
    assert product.preco_venda > 0


@pytest.mark.django_db
def test_lote_imutavel_numero_e_quantidade():
    tenant = _tenant()
    prod = _product(tenant)
    lote = _lote(prod, quantidade=5)

    with pytest.raises(ValidationError):
        lote.quantidade_inicial = 10
        lote.save()
    with pytest.raises(ValidationError):
        lote.numero_lote = "L002"
        lote.save()


@pytest.mark.django_db
def test_inventory_movement_output_reduces_lot():
    tenant = _tenant()
    prod = _product(tenant)
    lote = _lote(prod, quantidade=5)

    venda = Sale.objects.create(inquilino=tenant, numero="V001", total=Decimal("0"))
    item = SaleItem.objects.create(
        inquilino=tenant, venda=venda, produto=prod, quantidade=2, preco_unitario=Decimal("10.00")
    )
    mov = InventoryMovement.objects.create(
        inquilino=tenant,
        lote=lote,
        tipo=MovementType.SAIDA,
        origem=MovementOrigin.VENDA,
        item_venda=item,
        quantidade=2,
    )

    assert mov.pk
    assert mov.tipo == MovementType.SAIDA


@pytest.mark.django_db
def test_venda_itens_e_total():
    tenant = _tenant()
    Patient.objects.create(inquilino=tenant, nome="Cliente", genero="Masculino", endereco_rua="Rua Z")
    prod = _product(tenant)
    _lote(prod, quantidade=10)

    venda = Sale.objects.create(inquilino=tenant, numero="V002", total=Decimal("0.00"))
    item = SaleItem.objects.create(
        inquilino=tenant,
        venda=venda,
        produto=prod,
        quantidade=2,
        preco_unitario=Decimal("10.00"),
    )

    assert venda.itens.count() == 1
    assert item.total_linha == Decimal("20.00")
    venda.refresh_from_db()
    item.update_sale_total()
    venda.refresh_from_db()
    assert venda.total == Decimal("20.00")


_produto = _product
test_produto_campos_obrigatorios = test_product_required_fields
test_movimento_estoque_saida_reduz_lote = test_inventory_movement_output_reduces_lot
