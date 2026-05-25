from api.core.filters import SafeFilterSet
from apps.warehouse.models import (
    CycleCount,
    CycleCountLine,
    GoodsReceipt,
    GoodsReceiptLine,
    PickList,
    PickListLine,
    PurchaseOrder,
    PurchaseOrderLine,
    ReplenishmentPlan,
    ReplenishmentSuggestion,
    SalesOrder,
    SalesOrderLine,
    Shipment,
    ShipmentLine,
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


BASE_FIELDS = [
    "tenant",
    "custom_id",
    "deleted",
    "deleted_at",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class WarehouseFilter(SafeFilterSet):
    class Meta:
        model = Warehouse
        fields = [*BASE_FIELDS, "code", "warehouse_type", "status"]


class StorageLocationFilter(SafeFilterSet):
    class Meta:
        model = StorageLocation
        fields = [*BASE_FIELDS, "warehouse", "parent", "code", "location_type", "status"]


class WarehouseItemCategoryFilter(SafeFilterSet):
    class Meta:
        model = WarehouseItemCategory
        fields = [*BASE_FIELDS, "code", "status"]


class WarehouseItemFilter(SafeFilterSet):
    class Meta:
        model = WarehouseItem
        fields = [*BASE_FIELDS, "sku", "category", "item_type", "unit_of_measure", "status", "pharmacy_product"]


class WarehouseLotFilter(SafeFilterSet):
    class Meta:
        model = WarehouseLot
        fields = [*BASE_FIELDS, "item", "lot_number", "expiration_date", "status"]


class StockLevelFilter(SafeFilterSet):
    class Meta:
        model = StockLevel
        fields = [*BASE_FIELDS, "item", "lot", "location"]


class StockMovementFilter(SafeFilterSet):
    class Meta:
        model = StockMovement
        fields = [
            *BASE_FIELDS,
            "item",
            "lot",
            "source_location",
            "destination_location",
            "movement_type",
            "status",
            "posted_at",
        ]


class SalesOrderFilter(SafeFilterSet):
    class Meta:
        model = SalesOrder
        fields = [
            *BASE_FIELDS,
            "order_number",
            "customer_name",
            "customer_document",
            "requested_ship_date",
            "priority",
            "status",
        ]


class SalesOrderLineFilter(SafeFilterSet):
    class Meta:
        model = SalesOrderLine
        fields = [*BASE_FIELDS, "sales_order", "item", "lot", "preferred_location"]


class StockReservationFilter(SafeFilterSet):
    class Meta:
        model = StockReservation
        fields = [*BASE_FIELDS, "sales_order", "sales_order_line", "item", "lot", "location", "status"]


class PickListFilter(SafeFilterSet):
    class Meta:
        model = PickList
        fields = [*BASE_FIELDS, "pick_number", "sales_order", "status", "started_at", "completed_at"]


class PickListLineFilter(SafeFilterSet):
    class Meta:
        model = PickListLine
        fields = [*BASE_FIELDS, "pick_list", "sales_order_line", "reservation", "item", "lot", "source_location"]


class ShipmentFilter(SafeFilterSet):
    class Meta:
        model = Shipment
        fields = [*BASE_FIELDS, "shipment_number", "sales_order", "status", "shipped_at", "carrier_name"]


class ShipmentLineFilter(SafeFilterSet):
    class Meta:
        model = ShipmentLine
        fields = [*BASE_FIELDS, "shipment", "sales_order_line", "reservation", "item", "lot", "source_location"]


class ReplenishmentPlanFilter(SafeFilterSet):
    class Meta:
        model = ReplenishmentPlan
        fields = [*BASE_FIELDS, "plan_number", "warehouse", "supplier_name", "status", "generated_at", "purchase_order"]


class ReplenishmentSuggestionFilter(SafeFilterSet):
    class Meta:
        model = ReplenishmentSuggestion
        fields = [*BASE_FIELDS, "plan", "item", "warehouse", "status"]


class PurchaseOrderFilter(SafeFilterSet):
    class Meta:
        model = PurchaseOrder
        fields = [*BASE_FIELDS, "order_number", "supplier_name", "ordered_at", "expected_at", "status"]


class PurchaseOrderLineFilter(SafeFilterSet):
    class Meta:
        model = PurchaseOrderLine
        fields = [*BASE_FIELDS, "purchase_order", "item"]


class GoodsReceiptFilter(SafeFilterSet):
    class Meta:
        model = GoodsReceipt
        fields = [*BASE_FIELDS, "receipt_number", "purchase_order", "warehouse", "default_location", "received_at", "status"]


class GoodsReceiptLineFilter(SafeFilterSet):
    class Meta:
        model = GoodsReceiptLine
        fields = [*BASE_FIELDS, "receipt", "purchase_order_line", "item", "lot", "location"]


class StockTransferFilter(SafeFilterSet):
    class Meta:
        model = StockTransfer
        fields = [*BASE_FIELDS, "transfer_number", "source_location", "destination_location", "status", "posted_at"]


class StockTransferLineFilter(SafeFilterSet):
    class Meta:
        model = StockTransferLine
        fields = [*BASE_FIELDS, "transfer", "item", "lot"]


class CycleCountFilter(SafeFilterSet):
    class Meta:
        model = CycleCount
        fields = [*BASE_FIELDS, "count_number", "location", "counted_at", "status", "posted_at"]


class CycleCountLineFilter(SafeFilterSet):
    class Meta:
        model = CycleCountLine
        fields = [*BASE_FIELDS, "cycle_count", "item", "lot"]


FILTER_MAP = {
    "armazem": WarehouseFilter,
    "categoriaitem": WarehouseItemCategoryFilter,
    "contagemciclica": CycleCountFilter,
    "contagemciclicalinha": CycleCountLineFilter,
    "expedicao": ShipmentFilter,
    "item": WarehouseItemFilter,
    "linhaexpedicao": ShipmentLineFilter,
    "linhaordemcompra": PurchaseOrderLineFilter,
    "linharecebimento": GoodsReceiptLineFilter,
    "linhapedidovenda": SalesOrderLineFilter,
    "linhaseparacao": PickListLineFilter,
    "linhatransferencia": StockTransferLineFilter,
    "localizacao": StorageLocationFilter,
    "lote": WarehouseLotFilter,
    "movimento": StockMovementFilter,
    "ordemcompra": PurchaseOrderFilter,
    "pedidovenda": SalesOrderFilter,
    "planoreposicao": ReplenishmentPlanFilter,
    "recebimento": GoodsReceiptFilter,
    "reserva": StockReservationFilter,
    "saldo": StockLevelFilter,
    "separacao": PickListFilter,
    "sugestaoreposicao": ReplenishmentSuggestionFilter,
    "transferencia": StockTransferFilter,
}
