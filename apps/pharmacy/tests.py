"""Testes de integração da app de farmácia com comentários em português."""

from datetime import timedelta  # Para manipular datas de validade
from decimal import Decimal  # Para valores monetários

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.pharmacy.models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.material_requisition import (
    MaterialRequisitionStatus,
    RequestingSector,
    RequisitionSource,
)
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem
from apps.tenants.models.tenant import Tenant
from services.reports.async_exports import get_export_job_payload, get_export_job_state


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

    lot_qs = Lot.available(prod)
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
    assert Lot.available(prod).first().saldo == 3


@pytest.mark.django_db
def test_inventory_movement_queryset_delete_is_soft_delete():
    tenant = _tenant()
    prod = _product(tenant)
    lot = _lot(prod, quantity=5)

    movement = InventoryMovement.objects.create(
        tenant=tenant,
        lot=lot,
        type=MovementType.SAIDA,
        origin=MovementOrigin.AJUSTE,
        quantity=2,
    )

    deleted_count, deleted_by_model = InventoryMovement.objects.filter(pk=movement.pk).delete()

    assert deleted_count == 1
    assert deleted_by_model == {"farmacia.InventoryMovement": 1}
    assert not InventoryMovement.objects.filter(pk=movement.pk).exists()
    assert InventoryMovement.all_objects.get(pk=movement.pk).deleted is True


@pytest.mark.django_db
def test_lot_available_ignores_soft_deleted_movements():
    tenant = _tenant()
    prod = _product(tenant)
    lot = _lot(prod, quantity=5)

    movement = InventoryMovement.objects.create(
        tenant=tenant,
        lot=lot,
        type=MovementType.SAIDA,
        origin=MovementOrigin.AJUSTE,
        quantity=2,
    )
    InventoryMovement.objects.filter(pk=movement.pk).delete()

    lot.refresh_from_db()
    assert lot.balance() == 5
    assert Lot.available(prod).get(pk=lot.pk).saldo == 5


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


def _api_user(tenant, *, username="pharmacy_api_user"):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Técnico de Farmácia")
    user.groups.add(group)
    return user


@pytest.mark.django_db
def test_pharmacy_api_uses_english_resource_routes(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-pharmacy-contracts",
        name="Tenant Pharmacy Contracts",
        domain="tenant-pharmacy-contracts.local",
        active=True,
    )
    user = _api_user(tenant, username="pharmacy_contract_user")

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)

    assert api_client.get("/api/v1/pharmacy/product/").status_code == 200
    assert api_client.get("/api/v1/pharmacy/lot/available/").status_code == 200
    assert api_client.get("/api/v1/pharmacy/material_requisition/").status_code == 200
    assert api_client.get("/api/v1/pharmacy/movimentoestoque/").status_code == 404
    assert api_client.get("/api/v1/pharmacy/requisicaomaterial/").status_code == 404


@pytest.mark.django_db
def test_stock_pdf_returns_pdf_synchronously(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-stock-pdf",
        name="Tenant Stock PDF",
        domain="tenant-stock-pdf.local",
        active=True,
    )
    product = _product(tenant)
    _lot(product, quantity=5)
    user = _api_user(tenant)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)

    response = api_client.get("/api/v1/pharmacy/lot/stock/pdf/")

    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


@pytest.mark.django_db
def test_stock_pdf_can_be_queued_as_async_export(api_client, monkeypatch):
    tenant = Tenant.objects.create(
        identifier="tn-stock-pdf-async",
        name="Tenant Stock PDF Async",
        domain="tenant-stock-pdf-async.local",
        active=True,
    )
    product = _product(tenant)
    _lot(product, quantity=3)
    user = _api_user(tenant, username="pharmacy_api_user_async")
    monkeypatch.setattr("api.utils.async_exports.enqueue_task", lambda *args, **kwargs: None)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)

    response = api_client.get("/api/v1/pharmacy/lot/stock/pdf/?async=1")

    assert response.status_code == 202
    data = response.data
    assert data["status"] == "queued"
    assert data["export_key"] == "pharmacy_stock_pdf"
    assert data["id"]
    assert data["download_url"]
    assert get_export_job_state(data["id"]) is not None
    payload = get_export_job_payload(data["id"])
    assert payload["summary"]["lots_count"] == 1
    assert payload["summary"]["total_balance"] == 3


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
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"lot": lot.id, "requested_quantity": 5}]},
        format="json",
    )
    assert create_resp.status_code == 201, create_resp.data
    req_id = create_resp.data["id"]
    assert create_resp.data["status"] == MaterialRequisitionStatus.PENDING

    # Aviar parcialmente (farmácia)
    api_client.force_authenticate(user=pharmacist)
    fulfill_resp = api_client.post(
        f"/api/v1/pharmacy/material_requisition/{req_id}/fulfill/",
        {"items": [{"id": create_resp.data["items"][0]["id"], "quantity": 3}]},
        format="json",
    )
    assert fulfill_resp.status_code == 200
    assert fulfill_resp.data["status"] == MaterialRequisitionStatus.PARTIAL

    lot.refresh_from_db()
    assert lot.balance() == 7
    assert InventoryMovement.objects.filter(origin=MovementOrigin.REQUISICAO, material_request_item__isnull=False).exists()


@pytest.mark.django_db
def test_material_requisition_visibility_is_sector_based(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-sec",
        name="Tenant ReqFar Sector",
        domain="tenant-reqfar-sec.local",
        active=True,
    )
    User = get_user_model()

    grp_lab, _ = Group.objects.get_or_create(name="Técnico de Laboratório")
    grp_recep, _ = Group.objects.get_or_create(name="Recepcionista")

    lab_a = User.objects.create_user(
        username="lab_a",
        email="lab-a@example.com",
        password="testpass123",
        tenant=tenant,
    )
    lab_a.is_staff = True
    lab_a.save(update_fields=["is_staff"])
    lab_a.groups.add(grp_lab)

    lab_b = User.objects.create_user(
        username="lab_b",
        email="lab-b@example.com",
        password="testpass123",
        tenant=tenant,
    )
    lab_b.is_staff = True
    lab_b.save(update_fields=["is_staff"])
    lab_b.groups.add(grp_lab)

    recep = User.objects.create_user(
        username="recep_a",
        email="recep-a@example.com",
        password="testpass123",
        tenant=tenant,
    )
    recep.is_staff = True
    recep.save(update_fields=["is_staff"])
    recep.groups.add(grp_recep)

    prod = _product(tenant)
    lot = Lot.objects.create(
        tenant=tenant,
        product=prod,
        lot_number="LREQSEC1",
        expiration_date=timezone.localdate() + timedelta(days=30),
        initial_quantity=12,
        sale_price=prod.sale_price,
    )

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=lab_a)
    create_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"lot": lot.id, "requested_quantity": 4}]},
        format="json",
    )
    assert create_resp.status_code == 201
    req_id = create_resp.data["id"]
    assert create_resp.data["sector"] == RequestingSector.LABORATORIO

    api_client.force_authenticate(user=lab_b)
    list_lab_b = api_client.get("/api/v1/pharmacy/material_requisition/")
    assert list_lab_b.status_code == 200
    payload_lab = list_lab_b.data if isinstance(list_lab_b.data, list) else list_lab_b.data.get("results", [])
    assert any(int(row["id"]) == int(req_id) for row in payload_lab)

    api_client.force_authenticate(user=recep)
    list_recep = api_client.get("/api/v1/pharmacy/material_requisition/")
    assert list_recep.status_code == 200
    payload_recep = list_recep.data if isinstance(list_recep.data, list) else list_recep.data.get("results", [])
    assert all(int(row["id"]) != int(req_id) for row in payload_recep)


@pytest.mark.django_db
def test_material_requisition_medicine_user_can_create(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-med",
        name="Tenant ReqFar Medicina",
        domain="tenant-reqfar-med.local",
        active=True,
    )
    User = get_user_model()
    grp_med, _ = Group.objects.get_or_create(name="Médico")

    medic = User.objects.create_user(
        username="med_user",
        email="med@example.com",
        password="testpass123",
        tenant=tenant,
    )
    medic.is_staff = True
    medic.save(update_fields=["is_staff"])
    medic.groups.add(grp_med)

    prod = _product(tenant)
    lot = Lot.objects.create(
        tenant=tenant,
        product=prod,
        lot_number="LREQMED1",
        expiration_date=timezone.localdate() + timedelta(days=40),
        initial_quantity=10,
        sale_price=prod.sale_price,
    )

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=medic)
    create_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"lot": lot.id, "requested_quantity": 3}]},
        format="json",
    )
    assert create_resp.status_code == 201, create_resp.data
    assert create_resp.data["status"] == MaterialRequisitionStatus.PENDING
    assert create_resp.data["sector"] == RequestingSector.MEDICINA


@pytest.mark.django_db
def test_material_requisition_requester_context_prefills_non_admin_sector(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-context",
        name="Tenant ReqFar Context",
        domain="tenant-reqfar-context.local",
        active=True,
    )
    User = get_user_model()
    grp_recep, _ = Group.objects.get_or_create(name="Recepcionista")

    requester = User.objects.create_user(
        username="recep_context",
        email="recep-context@example.com",
        password="testpass123",
        tenant=tenant,
    )
    requester.is_staff = True
    requester.save(update_fields=["is_staff"])
    requester.groups.add(grp_recep)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=requester)
    context_resp = api_client.get("/api/v1/pharmacy/material_requisition/requester-context/")
    assert context_resp.status_code == 200, context_resp.data
    assert context_resp.data["is_admin"] is False
    assert context_resp.data["sector_locked"] is True
    assert context_resp.data["can_create"] is True
    assert context_resp.data["requester_sector"] == RequestingSector.RECEPCAO
    assert context_resp.data["requester_sector_label"] == "Recepção"
    assert context_resp.data["requester_source"] == RequisitionSource.PHARMACY
    assert context_resp.data["available_sectors"] == [
        {
            "value": RequestingSector.RECEPCAO,
            "label": "Recepção",
            "source": RequisitionSource.PHARMACY,
            "source_label": "Estoque da farmácia",
        },
    ]


@pytest.mark.django_db
def test_material_requisition_non_admin_cannot_override_sector_payload(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-sector-lock",
        name="Tenant ReqFar Sector Lock",
        domain="tenant-reqfar-sector-lock.local",
        active=True,
    )
    User = get_user_model()
    grp_recep, _ = Group.objects.get_or_create(name="Recepcionista")

    requester = User.objects.create_user(
        username="recep_sector_lock",
        email="recep-sector-lock@example.com",
        password="testpass123",
        tenant=tenant,
    )
    requester.is_staff = True
    requester.save(update_fields=["is_staff"])
    requester.groups.add(grp_recep)

    product = _product(tenant)
    lot = Lot.objects.create(
        tenant=tenant,
        product=product,
        lot_number="LREQLOCK1",
        expiration_date=timezone.localdate() + timedelta(days=45),
        initial_quantity=8,
        sale_price=product.sale_price,
    )

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=requester)
    create_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {
            "sector": RequestingSector.LABORATORIO,
            "items_input": [{"lot": lot.id, "requested_quantity": 2}],
        },
        format="json",
    )
    assert create_resp.status_code == 400
    assert "sector" in str(create_resp.data).lower()


@pytest.mark.django_db
def test_material_requisition_admin_can_select_requester_sector(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-admin-sector",
        name="Tenant ReqFar Admin Sector",
        domain="tenant-reqfar-admin-sector.local",
        active=True,
    )
    User = get_user_model()
    grp_admin, _ = Group.objects.get_or_create(name="Administrador")

    admin_user = User.objects.create_user(
        username="admin_reqfar_sector",
        email="admin-reqfar-sector@example.com",
        password="testpass123",
        tenant=tenant,
    )
    admin_user.is_staff = True
    admin_user.save(update_fields=["is_staff"])
    admin_user.groups.add(grp_admin)

    product = _product(tenant)
    lot = Lot.objects.create(
        tenant=tenant,
        product=product,
        lot_number="LREQADM1",
        expiration_date=timezone.localdate() + timedelta(days=45),
        initial_quantity=8,
        sale_price=product.sale_price,
    )

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=admin_user)
    create_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {
            "sector": RequestingSector.ENFERMAGEM,
            "items_input": [{"lot": lot.id, "requested_quantity": 2}],
        },
        format="json",
    )
    assert create_resp.status_code == 201, create_resp.data
    assert create_resp.data["sector"] == RequestingSector.ENFERMAGEM


def _warehouse_stock(tenant, *, sku="INS-001", name="Insumo Y", quantity=20):
    """Cria item de armazém com saldo disponível numa localização."""
    from apps.warehouse.models import StockLevel, StorageLocation, Warehouse, WarehouseItem

    warehouse = Warehouse.objects.create(tenant=tenant, name="Armazém Central", code="WH1")
    location = StorageLocation.objects.create(tenant=tenant, name="Posição A", warehouse=warehouse, code="A1")
    item = WarehouseItem.objects.create(tenant=tenant, name=name, sku=sku)
    StockLevel.adjust(tenant=tenant, item=item, location=location, quantity_delta=Decimal(quantity))
    return item


@pytest.mark.django_db
def test_material_requisition_pharmacy_profile_requests_from_warehouse(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-ph",
        name="Tenant ReqFar Pharmacy",
        domain="tenant-reqfar-ph.local",
        active=True,
    )
    User = get_user_model()
    grp_ph, _ = Group.objects.get_or_create(name="Técnico de Farmácia")

    pharmacist = User.objects.create_user(
        username="ph_only",
        email="ph-only@example.com",
        password="testpass123",
        tenant=tenant,
    )
    pharmacist.is_staff = True
    pharmacist.save(update_fields=["is_staff"])
    pharmacist.groups.add(grp_ph)

    prod = _product(tenant)
    lot = Lot.objects.create(
        tenant=tenant,
        product=prod,
        lot_number="LREQPH1",
        expiration_date=timezone.localdate() + timedelta(days=50),
        initial_quantity=15,
        sale_price=prod.sale_price,
    )
    wh_item = _warehouse_stock(tenant, quantity=20)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=pharmacist)

    context_resp = api_client.get("/api/v1/pharmacy/material_requisition/requester-context/")
    assert context_resp.status_code == 200, context_resp.data
    assert context_resp.data["requester_sector"] == RequestingSector.FARMACIA
    assert context_resp.data["requester_source"] == RequisitionSource.WAREHOUSE

    stock_resp = api_client.get("/api/v1/pharmacy/material_requisition/warehouse-stock/")
    assert stock_resp.status_code == 200, stock_resp.data
    assert [(row["id"], row["available"]) for row in stock_resp.data] == [(wh_item.id, 20.0)]

    # Farmácia não pode requisitar lotes da própria farmácia.
    bad_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"lot": lot.id, "requested_quantity": 2}]},
        format="json",
    )
    assert bad_resp.status_code == 400
    assert "armazém" in str(bad_resp.data).lower()

    create_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"warehouse_item": wh_item.id, "requested_quantity": 8}]},
        format="json",
    )
    assert create_resp.status_code == 201, create_resp.data
    assert create_resp.data["sector"] == RequestingSector.FARMACIA
    assert create_resp.data["source"] == RequisitionSource.WAREHOUSE
    assert create_resp.data["items"][0]["available_quantity"] == 20
    req_id = create_resp.data["id"]

    fulfill_resp = api_client.post(
        f"/api/v1/pharmacy/material_requisition/{req_id}/fulfill/",
        {"items": [{"id": create_resp.data["items"][0]["id"], "quantity": 8}]},
        format="json",
    )
    assert fulfill_resp.status_code == 200, fulfill_resp.data
    assert fulfill_resp.data["status"] == MaterialRequisitionStatus.FULFILLED

    from apps.warehouse.models import StockLevel

    remaining = StockLevel.objects.filter(tenant=tenant, item=wh_item).first()
    assert remaining is not None
    assert remaining.quantity == Decimal("12")


@pytest.mark.django_db
def test_material_requisition_clinical_pharmacy_requests_from_pharmacy(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-fcl",
        name="Tenant ReqFar Clinical Pharmacy",
        domain="tenant-reqfar-fcl.local",
        active=True,
    )
    User = get_user_model()
    grp_fcl, _ = Group.objects.get_or_create(name="Farmácia Clínica")

    requester = User.objects.create_user(
        username="fcl_user",
        email="fcl-user@example.com",
        password="testpass123",
        tenant=tenant,
    )
    requester.is_staff = True
    requester.save(update_fields=["is_staff"])
    requester.groups.add(grp_fcl)

    prod = _product(tenant)
    lot = Lot.objects.create(
        tenant=tenant,
        product=prod,
        lot_number="LREQFCL1",
        expiration_date=timezone.localdate() + timedelta(days=50),
        initial_quantity=15,
        sale_price=prod.sale_price,
    )

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=requester)

    context_resp = api_client.get("/api/v1/pharmacy/material_requisition/requester-context/")
    assert context_resp.status_code == 200, context_resp.data
    assert context_resp.data["requester_sector"] == RequestingSector.FARMACIA_CLINICA
    assert context_resp.data["requester_source"] == RequisitionSource.PHARMACY

    create_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"lot": lot.id, "requested_quantity": 3}]},
        format="json",
    )
    assert create_resp.status_code == 201, create_resp.data
    assert create_resp.data["sector"] == RequestingSector.FARMACIA_CLINICA
    assert create_resp.data["source"] == RequisitionSource.PHARMACY


@pytest.mark.django_db
def test_material_requisition_by_product_fulfills_fefo_across_lots(api_client):
    """Requisição por produto (sem escolher lote): o avio resolve lotes FEFO."""
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-prod",
        name="Tenant ReqFar Produto",
        domain="tenant-reqfar-prod.local",
        active=True,
    )
    User = get_user_model()
    grp_recep, _ = Group.objects.get_or_create(name="Recepcionista")
    grp_ph, _ = Group.objects.get_or_create(name="Técnico de Farmácia")

    requester = User.objects.create_user(
        username="recep_prod",
        email="recep-prod@example.com",
        password="testpass123",
        tenant=tenant,
    )
    requester.is_staff = True
    requester.save(update_fields=["is_staff"])
    requester.groups.add(grp_recep)

    pharmacist = User.objects.create_user(
        username="ph_prod",
        email="ph-prod@example.com",
        password="testpass123",
        tenant=tenant,
    )
    pharmacist.is_staff = True
    pharmacist.save(update_fields=["is_staff"])
    pharmacist.groups.add(grp_ph)

    prod = _product(tenant)
    lot_early = Lot.objects.create(
        tenant=tenant,
        product=prod,
        lot_number="LPRODA",
        expiration_date=timezone.localdate() + timedelta(days=10),
        initial_quantity=4,
        sale_price=prod.sale_price,
    )
    lot_late = Lot.objects.create(
        tenant=tenant,
        product=prod,
        lot_number="LPRODB",
        expiration_date=timezone.localdate() + timedelta(days=90),
        initial_quantity=10,
        sale_price=prod.sale_price,
    )

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=requester)
    create_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"product": prod.id, "requested_quantity": 6}]},
        format="json",
    )
    assert create_resp.status_code == 201, create_resp.data
    item_data = create_resp.data["items"][0]
    assert item_data["available_quantity"] == 14
    assert item_data["product_name"] == prod.name

    api_client.force_authenticate(user=pharmacist)
    fulfill_resp = api_client.post(
        f"/api/v1/pharmacy/material_requisition/{create_resp.data['id']}/fulfill/",
        {"items": [{"id": item_data["id"], "quantity": 6}]},
        format="json",
    )
    assert fulfill_resp.status_code == 200, fulfill_resp.data
    assert fulfill_resp.data["status"] == MaterialRequisitionStatus.FULFILLED

    # FEFO: esgota o lote que vence primeiro (4) e tira o restante (2) do seguinte.
    assert lot_early.balance() == 0
    assert lot_late.balance() == 8


@pytest.mark.django_db
def test_material_requisition_by_product_allows_zero_stock_request(api_client):
    """Produto sem lotes/saldo pode ser requisitado; fica pendente até reposição."""
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-zero",
        name="Tenant ReqFar Zero",
        domain="tenant-reqfar-zero.local",
        active=True,
    )
    User = get_user_model()
    grp_recep, _ = Group.objects.get_or_create(name="Recepcionista")

    requester = User.objects.create_user(
        username="recep_zero",
        email="recep-zero@example.com",
        password="testpass123",
        tenant=tenant,
    )
    requester.is_staff = True
    requester.save(update_fields=["is_staff"])
    requester.groups.add(grp_recep)

    prod = _product(tenant)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=requester)
    create_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"product": prod.id, "requested_quantity": 5}]},
        format="json",
    )
    assert create_resp.status_code == 201, create_resp.data
    assert create_resp.data["status"] == MaterialRequisitionStatus.PENDING
    assert create_resp.data["items"][0]["available_quantity"] == 0


@pytest.mark.django_db
def test_material_requisition_fulfill_returns_clear_insufficient_stock_error(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-reqfar-stock",
        name="Tenant ReqFar Stock",
        domain="tenant-reqfar-stock.local",
        active=True,
    )
    User = get_user_model()
    grp_recep, _ = Group.objects.get_or_create(name="Recepcionista")
    grp_ph, _ = Group.objects.get_or_create(name="Técnico de Farmácia")

    requester = User.objects.create_user(
        username="req_stock",
        email="req-stock@example.com",
        password="testpass123",
        tenant=tenant,
    )
    requester.is_staff = True
    requester.save(update_fields=["is_staff"])
    requester.groups.add(grp_recep)

    pharmacist = User.objects.create_user(
        username="ph_stock",
        email="ph-stock@example.com",
        password="testpass123",
        tenant=tenant,
    )
    pharmacist.is_staff = True
    pharmacist.save(update_fields=["is_staff"])
    pharmacist.groups.add(grp_ph)

    prod = _product(tenant)
    lot = Lot.objects.create(
        tenant=tenant,
        product=prod,
        lot_number="LREQSTK1",
        expiration_date=timezone.localdate() + timedelta(days=30),
        initial_quantity=2,
        sale_price=prod.sale_price,
    )

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=requester)
    create_resp = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"lot": lot.id, "requested_quantity": 5}]},
        format="json",
    )
    assert create_resp.status_code == 201
    req_id = create_resp.data["id"]
    req_item_id = create_resp.data["items"][0]["id"]

    api_client.force_authenticate(user=pharmacist)
    fulfill_resp = api_client.post(
        f"/api/v1/pharmacy/material_requisition/{req_id}/fulfill/",
        {"items": [{"id": req_item_id, "quantity": 3}]},
        format="json",
    )
    assert fulfill_resp.status_code == 400
    msg = str(fulfill_resp.data).lower()
    assert "não é possível aviar" in msg or "nao e possivel aviar" in msg
    assert "estoque disponível" in msg or "estoque disponivel" in msg


@pytest.mark.django_db
def test_pharmacy_product_report_pdf_endpoints(api_client):
    tenant = Tenant.objects.create(
        identifier="tn-far-reports",
        name="Tenant Farmácia Reports",
        domain="tenant-far-reports.local",
        active=True,
    )
    User = get_user_model()
    grp_recep, _ = Group.objects.get_or_create(name="Recepcionista")
    grp_lab, _ = Group.objects.get_or_create(name="Técnico de Laboratório")
    grp_ph, _ = Group.objects.get_or_create(name="Técnico de Farmácia")

    recep = User.objects.create_user(
        username="recep_reports",
        email="recep-reports@example.com",
        password="testpass123",
        tenant=tenant,
    )
    recep.is_staff = True
    recep.save(update_fields=["is_staff"])
    recep.groups.add(grp_recep)

    lab = User.objects.create_user(
        username="lab_reports",
        email="lab-reports@example.com",
        password="testpass123",
        tenant=tenant,
    )
    lab.is_staff = True
    lab.save(update_fields=["is_staff"])
    lab.groups.add(grp_lab)

    pharmacist = User.objects.create_user(
        username="ph_reports",
        email="ph-reports@example.com",
        password="testpass123",
        tenant=tenant,
    )
    pharmacist.is_staff = True
    pharmacist.save(update_fields=["is_staff"])
    pharmacist.groups.add(grp_ph)

    prod_a = _product(tenant)
    prod_b = Product.objects.create(
        tenant=tenant,
        name="Medicamento Y",
        type=Product.ProductType.MEDICAMENTO,
        sale_price=Decimal("15.00"),
        category=prod_a.category,
    )
    lot_a = Lot.objects.create(
        tenant=tenant,
        product=prod_a,
        lot_number="LREP-A",
        expiration_date=timezone.localdate() + timedelta(days=90),
        initial_quantity=40,
        sale_price=prod_a.sale_price,
    )
    lot_b = Lot.objects.create(
        tenant=tenant,
        product=prod_b,
        lot_number="LREP-B",
        expiration_date=timezone.localdate() + timedelta(days=90),
        initial_quantity=30,
        sale_price=prod_b.sale_price,
    )

    api_client.defaults["HTTP_HOST"] = tenant.domain

    api_client.force_authenticate(user=recep)
    create_recep = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {"items_input": [{"lot": lot_a.id, "requested_quantity": 5}]},
        format="json",
    )
    assert create_recep.status_code == 201, create_recep.data

    api_client.force_authenticate(user=lab)
    create_lab = api_client.post(
        "/api/v1/pharmacy/material_requisition/",
        {
            "items_input": [
                {"lot": lot_a.id, "requested_quantity": 2},
                {"lot": lot_b.id, "requested_quantity": 1},
            ]
        },
        format="json",
    )
    assert create_lab.status_code == 201, create_lab.data

    api_client.force_authenticate(user=pharmacist)

    consumo_resp = api_client.get("/api/v1/pharmacy/product/consumption/pdf/")
    assert consumo_resp.status_code == 200
    assert "application/pdf" in consumo_resp["Content-Type"]
    assert len(consumo_resp.content) > 0

    top_resp = api_client.get("/api/v1/pharmacy/product/most-requested/pdf/?limit=10")
    assert top_resp.status_code == 200
    assert "application/pdf" in top_resp["Content-Type"]
    assert len(top_resp.content) > 0

    least_resp = api_client.get("/api/v1/pharmacy/product/least-requested/pdf/?limit=10")
    assert least_resp.status_code == 200
    assert "application/pdf" in least_resp["Content-Type"]
    assert len(least_resp.content) > 0

    sectors_resp = api_client.get(f"/api/v1/pharmacy/product/request-sectors/pdf/?product_id={prod_a.id}")
    assert sectors_resp.status_code == 200
    assert "application/pdf" in sectors_resp["Content-Type"]
    assert len(sectors_resp.content) > 0
