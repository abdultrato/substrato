from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.tenants.models import Tenant
from apps.warehouse.models import (
    GoodsReceipt,
    GoodsReceiptLine,
    PurchaseOrder,
    PurchaseOrderLine,
    ReplenishmentPlan,
    ReservationStatus,
    SalesOrder,
    SalesOrderLine,
    SalesOrderStatus,
    StockLevel,
    StockMovement,
    StockReservation,
    StockTransfer,
    StockTransferLine,
    StorageLocation,
    Warehouse,
    WarehouseItem,
    WarehouseItemCategory,
    WarehouseLot,
)


class WarehouseStockTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Tenant WMS", identifier="tenant-wms")
        self.warehouse = Warehouse.objects.create(tenant=self.tenant, code="WH-01", name="Armazem Central")
        self.location = StorageLocation.objects.create(
            tenant=self.tenant,
            warehouse=self.warehouse,
            code="A1",
            name="Posicao A1",
        )
        self.destination = StorageLocation.objects.create(
            tenant=self.tenant,
            warehouse=self.warehouse,
            code="B1",
            name="Posicao B1",
        )
        self.category = WarehouseItemCategory.objects.create(
            tenant=self.tenant,
            code="MAT",
            name="Materiais",
        )
        self.item = WarehouseItem.objects.create(
            tenant=self.tenant,
            sku="SKU-001",
            name="Luva Cirurgica",
            category=self.category,
        )

    def test_posted_movement_updates_stock_and_blocks_negative_issue(self):
        StockMovement.objects.create(
            tenant=self.tenant,
            item=self.item,
            destination_location=self.location,
            movement_type=StockMovement.MovementType.RECEIPT,
            quantity=Decimal("10"),
            name="Entrada inicial",
        )

        self.assertEqual(StockLevel.current(tenant=self.tenant, item=self.item, location=self.location), Decimal("10.0000"))

        StockMovement.objects.create(
            tenant=self.tenant,
            item=self.item,
            source_location=self.location,
            destination_location=self.destination,
            movement_type=StockMovement.MovementType.TRANSFER,
            quantity=Decimal("4"),
            name="Transferencia interna",
        )

        self.assertEqual(StockLevel.current(tenant=self.tenant, item=self.item, location=self.location), Decimal("6.0000"))
        self.assertEqual(StockLevel.current(tenant=self.tenant, item=self.item, location=self.destination), Decimal("4.0000"))

        with self.assertRaises(ValidationError):
            StockMovement.objects.create(
                tenant=self.tenant,
                item=self.item,
                source_location=self.location,
                movement_type=StockMovement.MovementType.ISSUE,
                quantity=Decimal("99"),
                name="Saida invalida",
            )

    def test_goods_receipt_post_creates_stock_and_updates_purchase_line(self):
        purchase = PurchaseOrder.objects.create(
            tenant=self.tenant,
            order_number="PO-001",
            supplier_name="Fornecedor WMS",
        )
        purchase_line = PurchaseOrderLine.objects.create(
            tenant=self.tenant,
            purchase_order=purchase,
            item=self.item,
            ordered_quantity=Decimal("12"),
            unit_cost=Decimal("5.50"),
        )
        receipt = GoodsReceipt.objects.create(
            tenant=self.tenant,
            receipt_number="GRN-001",
            purchase_order=purchase,
            warehouse=self.warehouse,
            default_location=self.location,
        )
        GoodsReceiptLine.objects.create(
            tenant=self.tenant,
            receipt=receipt,
            purchase_order_line=purchase_line,
            item=self.item,
            lot_number="LOT-001",
            location=self.location,
            quantity=Decimal("7"),
            unit_cost=Decimal("5.50"),
        )

        receipt.post()
        purchase_line.refresh_from_db()
        lot = WarehouseLot.objects.get(tenant=self.tenant, item=self.item, lot_number="LOT-001")

        self.assertEqual(purchase_line.received_quantity, Decimal("7.0000"))
        self.assertEqual(StockLevel.current(tenant=self.tenant, item=self.item, lot=lot, location=self.location), Decimal("7.0000"))

    def test_stock_transfer_document_posts_lines(self):
        StockMovement.objects.create(
            tenant=self.tenant,
            item=self.item,
            destination_location=self.location,
            movement_type=StockMovement.MovementType.RECEIPT,
            quantity=Decimal("8"),
            name="Entrada para transferencia",
        )
        transfer = StockTransfer.objects.create(
            tenant=self.tenant,
            transfer_number="TRF-001",
            source_location=self.location,
            destination_location=self.destination,
        )
        StockTransferLine.objects.create(
            tenant=self.tenant,
            transfer=transfer,
            item=self.item,
            quantity=Decimal("3"),
        )

        transfer.post()

        self.assertEqual(StockLevel.current(tenant=self.tenant, item=self.item, location=self.location), Decimal("5.0000"))
        self.assertEqual(StockLevel.current(tenant=self.tenant, item=self.item, location=self.destination), Decimal("3.0000"))

    def test_sales_order_reserves_picks_and_ships_stock(self):
        self.item.reorder_point = Decimal("8")
        self.item.reorder_quantity = Decimal("12")
        self.item.save(update_fields=["reorder_point", "reorder_quantity", "updated_at"])

        StockMovement.objects.create(
            tenant=self.tenant,
            item=self.item,
            destination_location=self.location,
            movement_type=StockMovement.MovementType.RECEIPT,
            quantity=Decimal("10"),
            name="Entrada para venda",
        )
        order = SalesOrder.objects.create(
            tenant=self.tenant,
            order_number="SO-001",
            customer_name="Cliente Empresarial",
        )
        line = SalesOrderLine.objects.create(
            tenant=self.tenant,
            sales_order=order,
            item=self.item,
            ordered_quantity=Decimal("6"),
            preferred_location=self.location,
        )

        order.confirm()
        order.allocate()
        line.refresh_from_db()

        self.assertEqual(line.reserved_quantity, Decimal("6.0000"))
        self.assertEqual(StockLevel.available_quantity_for(tenant=self.tenant, item=self.item, location=self.location), Decimal("4.0000"))
        self.assertEqual(StockReservation.objects.filter(sales_order=order, status=ReservationStatus.ACTIVE).count(), 1)

        pick_list = order.create_pick_list()
        self.assertEqual(pick_list.lines.count(), 1)

        shipment = order.ship()
        line.refresh_from_db()
        order.refresh_from_db()

        self.assertEqual(shipment.status, "SHIPPED")
        self.assertEqual(order.status, SalesOrderStatus.SHIPPED)
        self.assertEqual(line.reserved_quantity, Decimal("0.0000"))
        self.assertEqual(line.shipped_quantity, Decimal("6.0000"))
        self.assertEqual(StockLevel.current(tenant=self.tenant, item=self.item, location=self.location), Decimal("4.0000"))

        plan = ReplenishmentPlan.objects.create(
            tenant=self.tenant,
            plan_number="RPL-001",
            warehouse=self.warehouse,
            supplier_name="Fornecedor ERP",
        )
        plan.generate()
        purchase = plan.create_purchase_order()

        self.assertEqual(plan.suggestions.count(), 1)
        self.assertEqual(purchase.lines.count(), 1)
        self.assertEqual(purchase.lines.first().ordered_quantity, Decimal("12.0000"))

        oversized_order = SalesOrder.objects.create(
            tenant=self.tenant,
            order_number="SO-002",
            customer_name="Cliente sem estoque",
        )
        SalesOrderLine.objects.create(
            tenant=self.tenant,
            sales_order=oversized_order,
            item=self.item,
            ordered_quantity=Decimal("99"),
            preferred_location=self.location,
        )

        with self.assertRaises(ValidationError):
            oversized_order.allocate()
