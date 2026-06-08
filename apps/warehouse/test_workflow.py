from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.warehouse.models import (
    DocumentStatus,
    GoodsReceipt,
    PurchaseOrder,
    PurchaseOrderLine,
    StorageLocation,
    Warehouse,
    WarehouseItem,
    WarehouseLot,
    WarehouseStatus,
)
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-wh-{suffix}", name="Tenant WH", domain=f"{suffix}.local", active=True
    )


def _item(tenant):
    return WarehouseItem.objects.create(tenant=tenant, name="Soro Fisiológico", sku=f"SKU-{uuid4().hex[:6]}")


def _lot(tenant, item, *, days=120):
    return WarehouseLot.objects.create(
        tenant=tenant, item=item, lot_number=f"L-{uuid4().hex[:5]}",
        expiration_date=timezone.localdate() + timedelta(days=days),
    )


@pytest.mark.django_db
def test_lot_block_quarantine_release_cycle():
    tenant = _tenant()
    item = _item(tenant)
    lot = _lot(tenant, item)
    assert lot.status == WarehouseLot.LotStatus.AVAILABLE

    lot.block()
    assert lot.status == WarehouseLot.LotStatus.BLOCKED

    lot.release()
    assert lot.status == WarehouseLot.LotStatus.AVAILABLE

    lot.quarantine()
    assert lot.status == WarehouseLot.LotStatus.QUARANTINE

    lot.release()
    assert lot.status == WarehouseLot.LotStatus.AVAILABLE


@pytest.mark.django_db
def test_mark_expired_then_state_change_blocked():
    tenant = _tenant()
    item = _item(tenant)
    lot = _lot(tenant, item)
    lot.mark_expired()
    assert lot.status == WarehouseLot.LotStatus.EXPIRED
    # Lote vencido não muda de estado.
    with pytest.raises(ValidationError):
        lot.block()
    with pytest.raises(ValidationError):
        lot.quarantine()


@pytest.mark.django_db
def test_release_rejected_when_lot_past_expiration():
    tenant = _tenant()
    item = _item(tenant)
    expired_lot = _lot(tenant, item, days=-1)  # já passou da validade
    expired_lot.block()  # ainda permitido (status != EXPIRED)
    with pytest.raises(ValidationError):
        expired_lot.release()  # não pode liberar um lote fisicamente vencido


@pytest.mark.django_db
def test_warehouse_activate_deactivate():
    tenant = _tenant()
    wh = Warehouse.objects.create(tenant=tenant, name="Central", code=f"W-{uuid4().hex[:5]}")
    assert wh.status == WarehouseStatus.ACTIVE

    wh.deactivate()
    assert wh.status == WarehouseStatus.INACTIVE

    wh.activate()
    assert wh.status == WarehouseStatus.ACTIVE


# --------------------------------------------------------------------------- #
# Logística Empresarial — ciclo da Ordem de Compra (§14.13)
# --------------------------------------------------------------------------- #
def _purchase_order(tenant):
    return PurchaseOrder.objects.create(
        tenant=tenant, order_number=f"PO-{uuid4().hex[:6]}", supplier_name="Fornecedor X"
    )


@pytest.mark.django_db
def test_purchase_order_post_requires_lines_then_issues():
    tenant = _tenant()
    po = _purchase_order(tenant)
    assert po.status == DocumentStatus.DRAFT
    # Sem itens não pode ser emitido.
    with pytest.raises(ValidationError):
        po.post()

    PurchaseOrderLine.objects.create(
        tenant=tenant, purchase_order=po, item=_item(tenant), ordered_quantity="10"
    )
    po.post()
    assert po.status == DocumentStatus.POSTED
    # Emitir de novo falha.
    with pytest.raises(ValidationError):
        po.post()


@pytest.mark.django_db
def test_purchase_order_cancel_and_block_when_received():
    tenant = _tenant()
    po = _purchase_order(tenant)
    PurchaseOrderLine.objects.create(
        tenant=tenant, purchase_order=po, item=_item(tenant), ordered_quantity="5"
    )
    po.post()

    wh = Warehouse.objects.create(tenant=tenant, name="Central", code=f"W-{uuid4().hex[:5]}")
    loc = StorageLocation.objects.create(tenant=tenant, warehouse=wh, name="Doca", code=f"L-{uuid4().hex[:5]}")
    GoodsReceipt.objects.create(
        tenant=tenant, receipt_number=f"GR-{uuid4().hex[:6]}", purchase_order=po,
        warehouse=wh, default_location=loc, status=DocumentStatus.POSTED,
    )
    # Recebimento lançado bloqueia o cancelamento.
    with pytest.raises(ValidationError):
        po.cancel()


@pytest.mark.django_db
def test_purchase_order_cancel_in_draft():
    tenant = _tenant()
    po = _purchase_order(tenant)
    po.cancel()
    assert po.status == DocumentStatus.CANCELLED
    with pytest.raises(ValidationError):
        po.cancel()
