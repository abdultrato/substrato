"""Testes de integração da app de farmácia com comentários em português."""

from datetime import timedelta  # Para manipular datas de validade
from decimal import Decimal  # Para valores monetários

from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.pharmacy.models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.material_requisition import MaterialRequisitionStatus
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem
from apps.tenants.models.tenant import Tenant


def _tenant():
    """Cria tenant de teste."""
    return Tenant.objects.create(identifier="tn-far", name="Tenant Farmacia")


def _product(tenant):
    """Cria produto padrão para os testes."""
    cat = ProductCategory.objects.create(tenant=tenant, name="Categoria", description="")
    return Product.objects.create(
        tenant=tenant,
        name="Medicamento X",
        type=Product.ProductType.MEDICAMENTO,
        sale_price=Decimal("10.00"),
        category=cat,
    )


def _lot(product, expiration_date_days=30, quantity=10):
    """Cria lote com quantidade e validade configuráveis."""
    return Lot.objects.create(
        tenant=product.tenant,
        product=product,
        lot_number="L001",
        expiration_date=timezone.localdate() + timedelta(days=expiration_date_days),
        initial_quantity=quantity,
        sale_price=product.sale_price,
    )


@pytest.mark.django_db
def test_product_required_fields():
    """Verifica campos obrigatórios do produto."""
    tenant = _tenant()
    product = _product(tenant)
    assert product.tenant == tenant
    assert product.sale_price > 0


@pytest.mark.django_db
def test_lot_imutavel_number_e_quantity():
    """Garante que número e quantidade inicial do lote são imutáveis."""
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
    """Confere que saída de estoque reduz o saldo do lote."""
    tenant = _tenant()
    prod = _product(tenant)
    lot = _lot(prod, quantity=5)

    sale = Sale.objects.create(tenant=tenant, number="V001", total=Decimal("0"))
    item = SaleItem.objects.create(tenant=tenant, sale=sale, product=prod, quantity=2)
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
    assert item.unit_price == prod.sale_price
    lot.refresh_from_db()
    # O SaleItem já gerou uma saída automática de 2 no save; este movimento manual
    # adiciona mais 2 de saída: 5 - 4 = 1.
    assert lot.balance() == 1
    assert prod.inventory_total == 1


@pytest.mark.django_db
def test_lot_balance_on_creation_matches_initial_quantity():
    tenant = _tenant()
    prod = _product(tenant)
    lot = _lot(prod, quantity=7)

    assert lot.movimentos.filter(
        type=MovementType.ENTRADA,
        origin=MovementOrigin.AJUSTE,
        quantity=7,
    ).exists()
    assert lot.balance() == 7

    lot_qs = Lot.disponiveis(prod)
    assert lot_qs.count() == 1
    assert lot_qs.first().saldo == 7


@pytest.mark.django_db
def test_product_inventory_total_uses_effective_lot_balance():
    tenant = _tenant()
    prod = _product(tenant)
    lot = _lot(prod, quantity=5)

    InventoryMovement.objects.create(
        tenant=tenant,
        lot=lot,
        type=MovementType.SAIDA,
        origin=MovementOrigin.AJUSTE,
        quantity=2,
    )

    lot.refresh_from_db()
    assert lot.balance() == 3
    assert prod.inventory_total == 3
    assert Lot.disponiveis(prod).first().saldo == 3


@pytest.mark.django_db
def test_sale_itens_e_total():
    """Valida quantidade de itens e total calculado da venda."""
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
    )

    assert sale.itens.count() == 1
    assert item.total_linha == Decimal("20.00")
    sale.refresh_from_db()
    item.update_sale_total()
    sale.refresh_from_db()
    assert sale.total == Decimal("20.00")


@pytest.mark.django_db
def test_sale_item_ignores_manual_unit_price_and_inherits_product_price():
    tenant = _tenant()
    prod = _product(tenant)
    _lot(prod, quantity=10)
    sale = Sale.objects.create(tenant=tenant, number="V003", total=Decimal("0.00"))

    item = SaleItem.objects.create(
        tenant=tenant,
        sale=sale,
        product=prod,
        quantity=1,
        unit_price=Decimal("99.99"),
    )

    assert item.unit_price == prod.sale_price


_product = _product


@pytest.mark.django_db
def test_material_requisition_api_flow_create_and_fulfill(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-reqfar",
        name="Tenant ReqFar",
        domain="tenant-reqfar.local",
        active=True,
    )

    # Usuário solicitante (Recepção)
    User = get_user_model()
    requester = User.objects.create_user(
        username="req_user",
        email="req@example.com",
        password="testpass123",
        tenant=tenant,
    )
    requester.is_staff = True
    requester.save(update_fields=["is_staff"])
    grp_recep, _ = Group.objects.get_or_create(name="Recepcionista")
    requester.groups.add(grp_recep)

    # Usuário farmácia
    pharmacist = User.objects.create_user(
        username="ph_user",
        email="ph@example.com",
        password="testpass123",
        tenant=tenant,
    )
    pharmacist.is_staff = True
    pharmacist.save(update_fields=["is_staff"])
    grp_ph, _ = Group.objects.get_or_create(name="Técnico de Farmácia")
    pharmacist.groups.add(grp_ph)

    # Produto + lote com estoque
    prod = _product(tenant)
    lot = Lot.objects.create(
        tenant=tenant,
        product=prod,
        lot_number="LREQ1",
        expiration_date=timezone.localdate() + timedelta(days=60),
        initial_quantity=10,
        sale_price=prod.sale_price,
    )

    # Criar requisição (solicitante)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=requester)
    create_resp = api_client.post(
        "/api/v1/pharmacy/requisicaomaterial/",
        {"items_input": [{"lot": lot.id, "requested_quantity": 5}]},
        format="json",
    )
    assert create_resp.status_code == 201, create_resp.data
    req_id = create_resp.data["id"]
    assert create_resp.data["status"] == MaterialRequisitionStatus.PENDING

    # Aviar parcialmente (farmácia)
    api_client.force_authenticate(user=pharmacist)
    fulfill_resp = api_client.post(
        f"/api/v1/pharmacy/requisicaomaterial/{req_id}/aviar/",
        {"items": [{"id": create_resp.data["items"][0]["id"], "quantity": 3}]},
        format="json",
    )
    assert fulfill_resp.status_code == 200
    assert fulfill_resp.data["status"] == MaterialRequisitionStatus.PARTIAL

    lot.refresh_from_db()
    assert lot.balance() == 7
    assert InventoryMovement.objects.filter(origin=MovementOrigin.REQUISICAO, material_request_item__isnull=False).exists()
