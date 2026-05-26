from rest_framework import serializers

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

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class StorageLocationSerializer(serializers.ModelSerializer):
    warehouse_label = serializers.CharField(source="warehouse.name", read_only=True)

    class Meta:
        model = StorageLocation
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "warehouse_label")


class WarehouseItemCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WarehouseItemCategory
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class WarehouseItemSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="category.name", read_only=True)
    current_stock = serializers.SerializerMethodField()

    def get_current_stock(self, obj):
        total = sum((level.quantity for level in obj.stock_levels.filter(deleted=False)), start=0)
        return str(total)

    class Meta:
        model = WarehouseItem
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "category_label", "current_stock")


class WarehouseLotSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = WarehouseLot
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "item_sku", "expired")


class StockLevelSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    location_code = serializers.CharField(source="location.code", read_only=True)
    reserved_quantity = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)
    available_quantity = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)

    class Meta:
        model = StockLevel
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "quantity",
            "item_sku",
            "lot_number",
            "location_code",
            "reserved_quantity",
            "available_quantity",
        )


class StockMovementSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)

    class Meta:
        model = StockMovement
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "posted_at", "item_sku", "lot_number")


class SalesOrderLineSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    pending_reservation_quantity = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)
    pending_shipment_quantity = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)

    class Meta:
        model = SalesOrderLine
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "reserved_quantity",
            "shipped_quantity",
            "item_sku",
            "lot_number",
            "pending_reservation_quantity",
            "pending_shipment_quantity",
        )


class StockReservationSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="sales_order.order_number", read_only=True)
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    location_code = serializers.CharField(source="location.code", read_only=True)

    class Meta:
        model = StockReservation
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "order_number",
            "item_sku",
            "lot_number",
            "location_code",
            "reserved_at",
            "released_at",
            "consumed_at",
        )


class SalesOrderSerializer(serializers.ModelSerializer):
    lines = SalesOrderLineSerializer(many=True, read_only=True)

    class Meta:
        model = SalesOrder
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "status",
            "confirmed_at",
            "allocated_at",
            "shipped_at",
            "lines",
        )


class PickListLineSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    location_code = serializers.CharField(source="source_location.code", read_only=True)

    class Meta:
        model = PickListLine
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "item_sku", "lot_number", "location_code")


class PickListSerializer(serializers.ModelSerializer):
    lines = PickListLineSerializer(many=True, read_only=True)

    class Meta:
        model = PickList
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "status", "started_at", "completed_at", "lines")


class ShipmentLineSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    location_code = serializers.CharField(source="source_location.code", read_only=True)

    class Meta:
        model = ShipmentLine
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "item_sku", "lot_number", "location_code")


class ShipmentSerializer(serializers.ModelSerializer):
    lines = ShipmentLineSerializer(many=True, read_only=True)

    class Meta:
        model = Shipment
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "status", "shipped_at", "lines")


class ReplenishmentSuggestionSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    warehouse_label = serializers.CharField(source="warehouse.name", read_only=True)

    class Meta:
        model = ReplenishmentSuggestion
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "current_quantity",
            "reserved_quantity",
            "available_quantity",
            "reorder_point",
            "status",
            "item_sku",
            "warehouse_label",
        )


class ReplenishmentPlanSerializer(serializers.ModelSerializer):
    suggestions = ReplenishmentSuggestionSerializer(many=True, read_only=True)
    purchase_order_number = serializers.CharField(source="purchase_order.order_number", read_only=True)

    class Meta:
        model = ReplenishmentPlan
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "status",
            "generated_at",
            "purchase_order",
            "purchase_order_number",
            "suggestions",
        )


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    pending_quantity = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)

    class Meta:
        model = PurchaseOrderLine
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "received_quantity", "item_sku", "pending_quantity")


class PurchaseOrderSerializer(serializers.ModelSerializer):
    lines = PurchaseOrderLineSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "lines")


class GoodsReceiptLineSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)

    class Meta:
        model = GoodsReceiptLine
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "item_sku")


class GoodsReceiptSerializer(serializers.ModelSerializer):
    lines = GoodsReceiptLineSerializer(many=True, read_only=True)

    class Meta:
        model = GoodsReceipt
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "status", "posted_at", "lines")


class StockTransferLineSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)

    class Meta:
        model = StockTransferLine
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "item_sku")


class StockTransferSerializer(serializers.ModelSerializer):
    lines = StockTransferLineSerializer(many=True, read_only=True)

    class Meta:
        model = StockTransfer
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "status", "posted_at", "lines")


class CycleCountLineSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    variance = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)

    class Meta:
        model = CycleCountLine
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "system_quantity", "item_sku", "variance")


class CycleCountSerializer(serializers.ModelSerializer):
    lines = CycleCountLineSerializer(many=True, read_only=True)

    class Meta:
        model = CycleCount
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "status", "posted_at", "lines")


SERIALIZER_MAP = {
    "cycle_count": CycleCountSerializer,
    "cycle_count_line": CycleCountLineSerializer,
    "goods_receipt": GoodsReceiptSerializer,
    "goods_receipt_line": GoodsReceiptLineSerializer,
    "item": WarehouseItemSerializer,
    "item_category": WarehouseItemCategorySerializer,
    "lot": WarehouseLotSerializer,
    "pick_list": PickListSerializer,
    "pick_list_line": PickListLineSerializer,
    "purchase_order": PurchaseOrderSerializer,
    "purchase_order_line": PurchaseOrderLineSerializer,
    "replenishment_plan": ReplenishmentPlanSerializer,
    "replenishment_suggestion": ReplenishmentSuggestionSerializer,
    "sales_order": SalesOrderSerializer,
    "sales_order_line": SalesOrderLineSerializer,
    "shipment": ShipmentSerializer,
    "shipment_line": ShipmentLineSerializer,
    "stock_level": StockLevelSerializer,
    "stock_movement": StockMovementSerializer,
    "stock_reservation": StockReservationSerializer,
    "stock_transfer": StockTransferSerializer,
    "stock_transfer_line": StockTransferLineSerializer,
    "storage_location": StorageLocationSerializer,
    "warehouse": WarehouseSerializer,
}
