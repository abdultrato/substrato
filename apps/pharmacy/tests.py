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
    return Tenant.objects.create(identifier="tn-far", name="Tenant Farmacia")


def _product(tenant):
    cat = ProductCategory.objects.create(tenant=tenant, name="Categoria", description="")
    return Product.objects.create(
        tenant=tenant,
        name="Medicamento X",
        type=Product.ProductType.MEDICAMENTO,
        sale_price=Decimal("10.00"),
        category=cat,
    )


def _lot(product, expiration_date_days=30, quantity=10):
    return Lot.objects.create(
        tenant=product.tenant,
        product=product,
        lot_number="L001",
        expiration_date=timezone.localdate() + timedelta(days=expiration_date_days),
        initial_quantity=quantity,
    )


@pytest.mark.django_db
def test_product_required_fields():
    tenant = _tenant()
    product = _product(tenant)
    assert product.tenant == tenant
    assert product.sale_price > 0


@pytest.mark.django_db
def test_lot_imutavel_number_e_quantity():
    tenant = _tenant()
    prod = _product(tenant)
    lot = _lot(prod, quantity=5)

    with pytest.raises(ValidationError):
        lot.initial_quantity = 10
        lot.save()
    with pytest.raises(ValidationError):
        lot.lot_number = "L002"
        lot.save()


@pytest.mark.django_db
def test_inventory_movement_output_reduces_lot():
    tenant = _tenant()
    prod = _product(tenant)
    lot = _lot(prod, quantity=5)

    sale = Sale.objects.create(tenant=tenant, number="V001", total=Decimal("0"))
    item = SaleItem.objects.create(
        tenant=tenant, sale=sale, product=prod, quantity=2, unit_price=Decimal("10.00")
    )
    mov = InventoryMovement.objects.create(
        tenant=tenant,
        lot=lot,
        type=MovementType.SAIDA,
        origin=MovementOrigin.VENDA,
        sale_item=item,
        quantity=2,
    )

    assert mov.pk
    assert mov.type == MovementType.SAIDA


@pytest.mark.django_db
def test_sale_itens_e_total():
    tenant = _tenant()
    Patient.objects.create(tenant=tenant, name="Cliente", gender="Masculino", address_street="Rua Z")
    prod = _product(tenant)
    _lot(prod, quantity=10)

    sale = Sale.objects.create(tenant=tenant, number="V002", total=Decimal("0.00"))
    item = SaleItem.objects.create(
        tenant=tenant,
        sale=sale,
        product=prod,
        quantity=2,
        unit_price=Decimal("10.00"),
    )

    assert sale.itens.count() == 1
    assert item.total_linha == Decimal("20.00")
    sale.refresh_from_db()
    item.update_sale_total()
    sale.refresh_from_db()
    assert sale.total == Decimal("20.00")


_product = _product
test_product_campos_obrigatorios = test_product_required_fields
test_inventory_movement_saida_reduz_lot = test_inventory_movement_output_reduces_lot
