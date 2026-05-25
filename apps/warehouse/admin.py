from django.contrib import admin, messages
from django.core.exceptions import ValidationError

from .models import (
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


class TenantAwareAdmin(admin.ModelAdmin):
    list_per_page = 50
    save_on_top = True
    show_full_result_count = False
    readonly_fields = (
        "custom_id",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
        "deleted_at",
        "deleted_by",
        "version",
    )


class PurchaseOrderLineInline(admin.TabularInline):
    model = PurchaseOrderLine
    extra = 0
    raw_id_fields = ("item",)
    readonly_fields = ("received_quantity",)


class GoodsReceiptLineInline(admin.TabularInline):
    model = GoodsReceiptLine
    extra = 0
    raw_id_fields = ("purchase_order_line", "item", "lot", "location")


class StockTransferLineInline(admin.TabularInline):
    model = StockTransferLine
    extra = 0
    raw_id_fields = ("item", "lot")


class CycleCountLineInline(admin.TabularInline):
    model = CycleCountLine
    extra = 0
    raw_id_fields = ("item", "lot")
    readonly_fields = ("system_quantity", "variance")


class SalesOrderLineInline(admin.TabularInline):
    model = SalesOrderLine
    extra = 0
    raw_id_fields = ("item", "lot", "preferred_location")
    readonly_fields = ("reserved_quantity", "shipped_quantity", "pending_reservation_quantity", "pending_shipment_quantity")


class PickListLineInline(admin.TabularInline):
    model = PickListLine
    extra = 0
    raw_id_fields = ("sales_order_line", "reservation", "item", "lot", "source_location")


class ShipmentLineInline(admin.TabularInline):
    model = ShipmentLine
    extra = 0
    raw_id_fields = ("sales_order_line", "reservation", "item", "lot", "source_location")


class ReplenishmentSuggestionInline(admin.TabularInline):
    model = ReplenishmentSuggestion
    extra = 0
    raw_id_fields = ("item", "warehouse")
    readonly_fields = (
        "current_quantity",
        "reserved_quantity",
        "available_quantity",
        "reorder_point",
        "status",
    )


def _post_documents(modeladmin, request, queryset):
    posted = 0
    for document in queryset:
        try:
            document.post()
            posted += 1
        except ValidationError as exc:
            modeladmin.message_user(request, f"{document}: {exc}", level=messages.ERROR)
    if posted:
        modeladmin.message_user(request, f"{posted} documento(s) lançado(s) com sucesso.", level=messages.SUCCESS)


_post_documents.short_description = "Lançar documentos selecionados"


def _run_sales_action(modeladmin, request, queryset, method_name: str, success_message: str):
    processed = 0
    for order in queryset:
        try:
            getattr(order, method_name)()
            processed += 1
        except ValidationError as exc:
            modeladmin.message_user(request, f"{order}: {exc}", level=messages.ERROR)
    if processed:
        modeladmin.message_user(request, f"{processed} pedido(s) {success_message}.", level=messages.SUCCESS)


def _confirm_sales_orders(modeladmin, request, queryset):
    _run_sales_action(modeladmin, request, queryset, "confirm", "confirmado(s)")


def _allocate_sales_orders(modeladmin, request, queryset):
    _run_sales_action(modeladmin, request, queryset, "allocate", "reservado(s)")


def _create_pick_lists(modeladmin, request, queryset):
    _run_sales_action(modeladmin, request, queryset, "create_pick_list", "com separação gerada")


def _ship_sales_orders(modeladmin, request, queryset):
    _run_sales_action(modeladmin, request, queryset, "ship", "expedido(s)")


def _cancel_sales_orders(modeladmin, request, queryset):
    _run_sales_action(modeladmin, request, queryset, "cancel", "cancelado(s)")


_confirm_sales_orders.short_description = "Confirmar pedidos selecionados"
_allocate_sales_orders.short_description = "Reservar estoque dos pedidos selecionados"
_create_pick_lists.short_description = "Gerar listas de separação"
_ship_sales_orders.short_description = "Expedir pedidos selecionados"
_cancel_sales_orders.short_description = "Cancelar pedidos selecionados"


def _generate_replenishment_plans(modeladmin, request, queryset):
    processed = 0
    for plan in queryset:
        try:
            plan.generate()
            processed += 1
        except ValidationError as exc:
            modeladmin.message_user(request, f"{plan}: {exc}", level=messages.ERROR)
    if processed:
        modeladmin.message_user(request, f"{processed} plano(s) gerado(s) com sucesso.", level=messages.SUCCESS)


def _create_replenishment_purchase_orders(modeladmin, request, queryset):
    processed = 0
    for plan in queryset:
        try:
            plan.create_purchase_order()
            processed += 1
        except ValidationError as exc:
            modeladmin.message_user(request, f"{plan}: {exc}", level=messages.ERROR)
    if processed:
        modeladmin.message_user(request, f"{processed} pedido(s) de compra criado(s).", level=messages.SUCCESS)


_generate_replenishment_plans.short_description = "Gerar sugestões de reposição"
_create_replenishment_purchase_orders.short_description = "Criar pedidos de compra das sugestões"


@admin.register(Warehouse)
class WarehouseAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "code", "name", "warehouse_type", "status", "created_at")
    list_filter = ("warehouse_type", "status")
    search_fields = ("custom_id", "code", "name", "address")


@admin.register(StorageLocation)
class StorageLocationAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "code", "name", "warehouse", "location_type", "status", "created_at")
    list_filter = ("warehouse", "location_type", "status")
    search_fields = ("custom_id", "code", "name", "barcode", "warehouse__name")
    raw_id_fields = ("warehouse", "parent")


@admin.register(WarehouseItemCategory)
class WarehouseItemCategoryAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "code", "name", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("custom_id", "code", "name")


@admin.register(WarehouseItem)
class WarehouseItemAdmin(TenantAwareAdmin):
    list_display = (
        "custom_id",
        "sku",
        "name",
        "category",
        "item_type",
        "unit_of_measure",
        "status",
        "created_at",
    )
    list_filter = ("category", "item_type", "status")
    search_fields = ("custom_id", "sku", "name", "barcode", "external_reference")
    raw_id_fields = ("category", "pharmacy_product")


@admin.register(WarehouseLot)
class WarehouseLotAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "item", "lot_number", "expiration_date", "status", "unit_cost", "created_at")
    list_filter = ("status", "expiration_date")
    search_fields = ("custom_id", "item__sku", "item__name", "lot_number")
    raw_id_fields = ("item",)


@admin.register(StockLevel)
class StockLevelAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "item", "lot", "location", "quantity", "updated_at")
    list_filter = ("location__warehouse", "location")
    search_fields = ("custom_id", "item__sku", "item__name", "lot__lot_number", "location__code")
    raw_id_fields = ("item", "lot", "location")
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "quantity")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(StockMovement)
class StockMovementAdmin(TenantAwareAdmin):
    list_display = (
        "custom_id",
        "movement_type",
        "item",
        "lot",
        "source_location",
        "destination_location",
        "quantity",
        "status",
        "posted_at",
    )
    list_filter = ("movement_type", "status", "posted_at")
    search_fields = ("custom_id", "name", "item__sku", "item__name", "reference_document")
    raw_id_fields = ("item", "lot", "source_location", "destination_location")
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "posted_at")


@admin.register(SalesOrder)
class SalesOrderAdmin(TenantAwareAdmin):
    list_display = (
        "custom_id",
        "order_number",
        "customer_name",
        "requested_ship_date",
        "priority",
        "status",
        "confirmed_at",
        "allocated_at",
        "shipped_at",
    )
    list_filter = ("status", "requested_ship_date", "priority")
    search_fields = ("custom_id", "order_number", "customer_name", "customer_document", "customer_reference")
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "confirmed_at", "allocated_at", "shipped_at")
    inlines = (SalesOrderLineInline,)
    actions = (
        _confirm_sales_orders,
        _allocate_sales_orders,
        _create_pick_lists,
        _ship_sales_orders,
        _cancel_sales_orders,
    )


@admin.register(SalesOrderLine)
class SalesOrderLineAdmin(TenantAwareAdmin):
    list_display = (
        "custom_id",
        "sales_order",
        "item",
        "lot",
        "ordered_quantity",
        "reserved_quantity",
        "shipped_quantity",
        "unit_price",
    )
    search_fields = ("custom_id", "sales_order__order_number", "item__sku", "item__name", "lot__lot_number")
    raw_id_fields = ("sales_order", "item", "lot", "preferred_location")
    readonly_fields = (
        *TenantAwareAdmin.readonly_fields,
        "reserved_quantity",
        "shipped_quantity",
        "pending_reservation_quantity",
        "pending_shipment_quantity",
    )


@admin.register(StockReservation)
class StockReservationAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "sales_order", "item", "lot", "location", "quantity", "status", "reserved_at")
    list_filter = ("status", "reserved_at", "location__warehouse")
    search_fields = ("custom_id", "sales_order__order_number", "item__sku", "item__name", "lot__lot_number")
    raw_id_fields = ("sales_order", "sales_order_line", "item", "lot", "location")
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "reserved_at", "released_at", "consumed_at")


@admin.register(PickList)
class PickListAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "pick_number", "sales_order", "status", "started_at", "completed_at", "created_at")
    list_filter = ("status", "started_at", "completed_at")
    search_fields = ("custom_id", "pick_number", "sales_order__order_number", "sales_order__customer_name")
    raw_id_fields = ("sales_order",)
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "completed_at")
    inlines = (PickListLineInline,)


@admin.register(PickListLine)
class PickListLineAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "pick_list", "item", "lot", "source_location", "quantity_to_pick", "quantity_picked")
    search_fields = ("custom_id", "pick_list__pick_number", "item__sku", "item__name", "lot__lot_number")
    raw_id_fields = ("pick_list", "sales_order_line", "reservation", "item", "lot", "source_location")


@admin.register(Shipment)
class ShipmentAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "shipment_number", "sales_order", "status", "carrier_name", "tracking_number", "shipped_at")
    list_filter = ("status", "shipped_at")
    search_fields = ("custom_id", "shipment_number", "sales_order__order_number", "carrier_name", "tracking_number")
    raw_id_fields = ("sales_order",)
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "shipped_at")
    inlines = (ShipmentLineInline,)
    actions = (_post_documents,)


@admin.register(ShipmentLine)
class ShipmentLineAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "shipment", "item", "lot", "source_location", "quantity")
    search_fields = ("custom_id", "shipment__shipment_number", "item__sku", "item__name", "lot__lot_number")
    raw_id_fields = ("shipment", "sales_order_line", "reservation", "item", "lot", "source_location")


@admin.register(ReplenishmentPlan)
class ReplenishmentPlanAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "plan_number", "warehouse", "supplier_name", "status", "generated_at", "purchase_order")
    list_filter = ("status", "generated_at", "warehouse")
    search_fields = ("custom_id", "plan_number", "supplier_name", "purchase_order__order_number")
    raw_id_fields = ("warehouse", "purchase_order")
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "generated_at", "purchase_order")
    inlines = (ReplenishmentSuggestionInline,)
    actions = (_generate_replenishment_plans, _create_replenishment_purchase_orders)


@admin.register(ReplenishmentSuggestion)
class ReplenishmentSuggestionAdmin(TenantAwareAdmin):
    list_display = (
        "custom_id",
        "plan",
        "item",
        "warehouse",
        "available_quantity",
        "reorder_point",
        "recommended_quantity",
        "estimated_unit_cost",
        "status",
    )
    list_filter = ("status", "warehouse")
    search_fields = ("custom_id", "plan__plan_number", "item__sku", "item__name")
    raw_id_fields = ("plan", "item", "warehouse")


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "order_number", "supplier_name", "ordered_at", "expected_at", "status", "created_at")
    list_filter = ("status", "ordered_at", "expected_at")
    search_fields = ("custom_id", "order_number", "supplier_name", "supplier_document")
    inlines = (PurchaseOrderLineInline,)


@admin.register(PurchaseOrderLine)
class PurchaseOrderLineAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "purchase_order", "item", "ordered_quantity", "received_quantity", "unit_cost")
    search_fields = ("custom_id", "purchase_order__order_number", "item__sku", "item__name")
    raw_id_fields = ("purchase_order", "item")
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "received_quantity")


@admin.register(GoodsReceipt)
class GoodsReceiptAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "receipt_number", "purchase_order", "warehouse", "received_at", "status", "posted_at")
    list_filter = ("status", "warehouse", "received_at")
    search_fields = ("custom_id", "receipt_number", "purchase_order__order_number")
    raw_id_fields = ("purchase_order", "warehouse", "default_location")
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "posted_at")
    inlines = (GoodsReceiptLineInline,)
    actions = (_post_documents,)


@admin.register(GoodsReceiptLine)
class GoodsReceiptLineAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "receipt", "item", "lot", "lot_number", "location", "quantity", "unit_cost")
    search_fields = ("custom_id", "receipt__receipt_number", "item__sku", "item__name", "lot_number")
    raw_id_fields = ("receipt", "purchase_order_line", "item", "lot", "location")


@admin.register(StockTransfer)
class StockTransferAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "transfer_number", "source_location", "destination_location", "status", "posted_at")
    list_filter = ("status", "source_location__warehouse", "destination_location__warehouse")
    search_fields = ("custom_id", "transfer_number", "name")
    raw_id_fields = ("source_location", "destination_location")
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "posted_at")
    inlines = (StockTransferLineInline,)
    actions = (_post_documents,)


@admin.register(StockTransferLine)
class StockTransferLineAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "transfer", "item", "lot", "quantity")
    search_fields = ("custom_id", "transfer__transfer_number", "item__sku", "item__name", "lot__lot_number")
    raw_id_fields = ("transfer", "item", "lot")


@admin.register(CycleCount)
class CycleCountAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "count_number", "location", "counted_at", "status", "posted_at")
    list_filter = ("status", "counted_at", "location__warehouse")
    search_fields = ("custom_id", "count_number", "name")
    raw_id_fields = ("location",)
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "posted_at")
    inlines = (CycleCountLineInline,)
    actions = (_post_documents,)


@admin.register(CycleCountLine)
class CycleCountLineAdmin(TenantAwareAdmin):
    list_display = ("custom_id", "cycle_count", "item", "lot", "system_quantity", "counted_quantity", "variance")
    search_fields = ("custom_id", "cycle_count__count_number", "item__sku", "item__name", "lot__lot_number")
    raw_id_fields = ("cycle_count", "item", "lot")
    readonly_fields = (*TenantAwareAdmin.readonly_fields, "system_quantity", "variance")
