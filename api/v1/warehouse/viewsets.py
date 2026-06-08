from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
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

from .filters import (
    CycleCountFilter,
    CycleCountLineFilter,
    GoodsReceiptFilter,
    GoodsReceiptLineFilter,
    PickListFilter,
    PickListLineFilter,
    PurchaseOrderFilter,
    PurchaseOrderLineFilter,
    ReplenishmentPlanFilter,
    ReplenishmentSuggestionFilter,
    SalesOrderFilter,
    SalesOrderLineFilter,
    ShipmentFilter,
    ShipmentLineFilter,
    StockLevelFilter,
    StockMovementFilter,
    StockReservationFilter,
    StockTransferFilter,
    StockTransferLineFilter,
    StorageLocationFilter,
    WarehouseFilter,
    WarehouseItemCategoryFilter,
    WarehouseItemFilter,
    WarehouseLotFilter,
)
from .serializers import (
    CycleCountLineSerializer,
    CycleCountSerializer,
    GoodsReceiptLineSerializer,
    GoodsReceiptSerializer,
    PickListLineSerializer,
    PickListSerializer,
    PurchaseOrderLineSerializer,
    PurchaseOrderSerializer,
    ReplenishmentPlanSerializer,
    ReplenishmentSuggestionSerializer,
    SalesOrderLineSerializer,
    SalesOrderSerializer,
    ShipmentLineSerializer,
    ShipmentSerializer,
    StockLevelSerializer,
    StockMovementSerializer,
    StockReservationSerializer,
    StockTransferLineSerializer,
    StockTransferSerializer,
    StorageLocationSerializer,
    WarehouseItemCategorySerializer,
    WarehouseItemSerializer,
    WarehouseLotSerializer,
    WarehouseSerializer,
)


def _as_drf_error(exc: DjangoValidationError) -> ValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or str(exc)
    return ValidationError(detail)


class WarehouseModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class PostDocumentMixin:
    @action(detail=True, methods=["post"], url_path="post", url_name="post")
    def post_document(self, request, pk=None):
        document = self.get_object()
        try:
            document = document.post()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        serializer = self.get_serializer(document)
        return Response(serializer.data)


class SalesOrderWorkflowMixin:
    @action(detail=True, methods=["post"], url_path="confirm", url_name="confirm")
    def confirm_order(self, request, pk=None):
        order = self.get_object()
        try:
            order = order.confirm()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(SalesOrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="allocate", url_name="allocate")
    def allocate_order(self, request, pk=None):
        order = self.get_object()
        try:
            order = order.allocate()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(SalesOrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="create-pick-list", url_name="create-pick-list")
    def create_pick_list(self, request, pk=None):
        order = self.get_object()
        try:
            pick_list = order.create_pick_list()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(PickListSerializer(pick_list, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="ship", url_name="ship")
    def ship_order(self, request, pk=None):
        order = self.get_object()
        try:
            shipment = order.ship()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(ShipmentSerializer(shipment, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="cancel", url_name="cancel")
    def cancel_order(self, request, pk=None):
        order = self.get_object()
        try:
            order = order.cancel()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(SalesOrderSerializer(order, context=self.get_serializer_context()).data)


class WarehouseViewSet(WarehouseModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    filterset_class = WarehouseFilter
    search_fields = ("custom_id", "code", "name", "address")
    ordering = ["name"]

    @action(detail=True, methods=["post"], url_path="activate", url_name="activate")
    def activate(self, request, pk=None):
        warehouse = self.get_object()
        try:
            warehouse = warehouse.activate()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(warehouse).data)

    @action(detail=True, methods=["post"], url_path="deactivate", url_name="deactivate")
    def deactivate(self, request, pk=None):
        warehouse = self.get_object()
        try:
            warehouse = warehouse.deactivate()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(warehouse).data)


class StorageLocationViewSet(WarehouseModelViewSet):
    queryset = StorageLocation.objects.select_related("warehouse", "parent")
    serializer_class = StorageLocationSerializer
    filterset_class = StorageLocationFilter
    search_fields = ("custom_id", "code", "name", "barcode", "warehouse__name")
    ordering = ["warehouse__name", "code"]


class WarehouseItemCategoryViewSet(WarehouseModelViewSet):
    queryset = WarehouseItemCategory.objects.all()
    serializer_class = WarehouseItemCategorySerializer
    filterset_class = WarehouseItemCategoryFilter
    search_fields = ("custom_id", "code", "name")
    ordering = ["name"]


class WarehouseItemViewSet(WarehouseModelViewSet):
    queryset = WarehouseItem.objects.select_related("category", "pharmacy_product")
    serializer_class = WarehouseItemSerializer
    filterset_class = WarehouseItemFilter
    search_fields = ("custom_id", "sku", "name", "barcode", "external_reference")
    ordering = ["name"]


class WarehouseLotViewSet(WarehouseModelViewSet):
    queryset = WarehouseLot.objects.select_related("item")
    serializer_class = WarehouseLotSerializer
    filterset_class = WarehouseLotFilter
    search_fields = ("custom_id", "item__sku", "item__name", "lot_number")
    ordering = ["expiration_date", "lot_number"]

    @action(detail=True, methods=["post"], url_path="block", url_name="block")
    def block(self, request, pk=None):
        lot = self.get_object()
        try:
            lot = lot.block()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(lot).data)

    @action(detail=True, methods=["post"], url_path="quarantine", url_name="quarantine")
    def quarantine(self, request, pk=None):
        lot = self.get_object()
        try:
            lot = lot.quarantine()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(lot).data)

    @action(detail=True, methods=["post"], url_path="release", url_name="release")
    def release(self, request, pk=None):
        lot = self.get_object()
        try:
            lot = lot.release()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(lot).data)

    @action(detail=True, methods=["post"], url_path="mark-expired", url_name="mark-expired")
    def mark_expired(self, request, pk=None):
        lot = self.get_object()
        try:
            lot = lot.mark_expired()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(lot).data)


class StockLevelViewSet(WarehouseModelViewSet):
    http_method_names = ["get", "head", "options"]
    queryset = StockLevel.objects.select_related("item", "lot", "location", "location__warehouse")
    serializer_class = StockLevelSerializer
    filterset_class = StockLevelFilter
    search_fields = ("custom_id", "item__sku", "item__name", "lot__lot_number", "location__code")
    ordering = ["item__name", "location__code"]


class StockMovementViewSet(WarehouseModelViewSet):
    queryset = StockMovement.objects.select_related("item", "lot", "source_location", "destination_location")
    serializer_class = StockMovementSerializer
    filterset_class = StockMovementFilter
    search_fields = ("custom_id", "name", "item__sku", "item__name", "reference_document", "reason")


class SalesOrderViewSet(SalesOrderWorkflowMixin, WarehouseModelViewSet):
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer
    filterset_class = SalesOrderFilter
    search_fields = ("custom_id", "order_number", "customer_name", "customer_document", "customer_reference")


class SalesOrderLineViewSet(WarehouseModelViewSet):
    queryset = SalesOrderLine.objects.select_related("sales_order", "item", "lot", "preferred_location")
    serializer_class = SalesOrderLineSerializer
    filterset_class = SalesOrderLineFilter
    search_fields = ("custom_id", "sales_order__order_number", "item__sku", "item__name", "lot__lot_number")


class StockReservationViewSet(WarehouseModelViewSet):
    queryset = StockReservation.objects.select_related("sales_order", "sales_order_line", "item", "lot", "location")
    serializer_class = StockReservationSerializer
    filterset_class = StockReservationFilter
    search_fields = ("custom_id", "sales_order__order_number", "item__sku", "item__name", "lot__lot_number")
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        raise ValidationError("Reservas devem ser geradas pelo pedido de venda usando a ação alocar.")

    @action(detail=True, methods=["post"], url_path="release", url_name="release")
    def release_reservation(self, request, pk=None):
        reservation = self.get_object()
        try:
            reservation = reservation.release()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(reservation).data)


class PickListViewSet(WarehouseModelViewSet):
    queryset = PickList.objects.select_related("sales_order")
    serializer_class = PickListSerializer
    filterset_class = PickListFilter
    search_fields = ("custom_id", "pick_number", "sales_order__order_number", "sales_order__customer_name")

    @action(detail=True, methods=["post"], url_path="complete", url_name="complete")
    def mark_picked(self, request, pk=None):
        pick_list = self.get_object()
        try:
            pick_list = pick_list.mark_picked()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(pick_list).data)


class PickListLineViewSet(WarehouseModelViewSet):
    queryset = PickListLine.objects.select_related(
        "pick_list",
        "sales_order_line",
        "reservation",
        "item",
        "lot",
        "source_location",
    )
    serializer_class = PickListLineSerializer
    filterset_class = PickListLineFilter
    search_fields = ("custom_id", "pick_list__pick_number", "item__sku", "item__name", "lot__lot_number")


class ShipmentViewSet(PostDocumentMixin, WarehouseModelViewSet):
    queryset = Shipment.objects.select_related("sales_order")
    serializer_class = ShipmentSerializer
    filterset_class = ShipmentFilter
    search_fields = ("custom_id", "shipment_number", "sales_order__order_number", "carrier_name", "tracking_number")

    @action(detail=True, methods=["post"], url_path="ship", url_name="ship")
    def ship_document(self, request, pk=None):
        return self.post_document(request, pk=pk)


class ShipmentLineViewSet(WarehouseModelViewSet):
    queryset = ShipmentLine.objects.select_related(
        "shipment",
        "sales_order_line",
        "reservation",
        "item",
        "lot",
        "source_location",
    )
    serializer_class = ShipmentLineSerializer
    filterset_class = ShipmentLineFilter
    search_fields = ("custom_id", "shipment__shipment_number", "item__sku", "item__name", "lot__lot_number")


class ReplenishmentPlanViewSet(WarehouseModelViewSet):
    queryset = ReplenishmentPlan.objects.select_related("warehouse", "purchase_order")
    serializer_class = ReplenishmentPlanSerializer
    filterset_class = ReplenishmentPlanFilter
    search_fields = ("custom_id", "plan_number", "supplier_name", "purchase_order__order_number")

    @action(detail=True, methods=["post"], url_path="generate", url_name="generate")
    def generate_plan(self, request, pk=None):
        plan = self.get_object()
        try:
            plan = plan.generate()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="create-purchase-order", url_name="create-purchase-order")
    def create_purchase_order(self, request, pk=None):
        plan = self.get_object()
        try:
            purchase = plan.create_purchase_order()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(PurchaseOrderSerializer(purchase, context=self.get_serializer_context()).data)


class ReplenishmentSuggestionViewSet(WarehouseModelViewSet):
    queryset = ReplenishmentSuggestion.objects.select_related("plan", "item", "warehouse")
    serializer_class = ReplenishmentSuggestionSerializer
    filterset_class = ReplenishmentSuggestionFilter
    search_fields = ("custom_id", "plan__plan_number", "item__sku", "item__name")


class PurchaseOrderViewSet(PostDocumentMixin, WarehouseModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    filterset_class = PurchaseOrderFilter
    search_fields = ("custom_id", "order_number", "supplier_name", "supplier_document")

    @action(detail=True, methods=["post"], url_path="cancel", url_name="cancel")
    def cancel_order(self, request, pk=None):
        order = self.get_object()
        try:
            order = order.cancel()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc) from exc
        return Response(self.get_serializer(order).data)


class PurchaseOrderLineViewSet(WarehouseModelViewSet):
    queryset = PurchaseOrderLine.objects.select_related("purchase_order", "item")
    serializer_class = PurchaseOrderLineSerializer
    filterset_class = PurchaseOrderLineFilter
    search_fields = ("custom_id", "purchase_order__order_number", "item__sku", "item__name")


class GoodsReceiptViewSet(PostDocumentMixin, WarehouseModelViewSet):
    queryset = GoodsReceipt.objects.select_related("purchase_order", "warehouse", "default_location")
    serializer_class = GoodsReceiptSerializer
    filterset_class = GoodsReceiptFilter
    search_fields = ("custom_id", "receipt_number", "purchase_order__order_number", "name")


class GoodsReceiptLineViewSet(WarehouseModelViewSet):
    queryset = GoodsReceiptLine.objects.select_related("receipt", "purchase_order_line", "item", "lot", "location")
    serializer_class = GoodsReceiptLineSerializer
    filterset_class = GoodsReceiptLineFilter
    search_fields = ("custom_id", "receipt__receipt_number", "item__sku", "item__name", "lot_number")


class StockTransferViewSet(PostDocumentMixin, WarehouseModelViewSet):
    queryset = StockTransfer.objects.select_related("source_location", "destination_location")
    serializer_class = StockTransferSerializer
    filterset_class = StockTransferFilter
    search_fields = ("custom_id", "transfer_number", "name")


class StockTransferLineViewSet(WarehouseModelViewSet):
    queryset = StockTransferLine.objects.select_related("transfer", "item", "lot")
    serializer_class = StockTransferLineSerializer
    filterset_class = StockTransferLineFilter
    search_fields = ("custom_id", "transfer__transfer_number", "item__sku", "item__name", "lot__lot_number")


class CycleCountViewSet(PostDocumentMixin, WarehouseModelViewSet):
    queryset = CycleCount.objects.select_related("location")
    serializer_class = CycleCountSerializer
    filterset_class = CycleCountFilter
    search_fields = ("custom_id", "count_number", "name", "location__code")


class CycleCountLineViewSet(WarehouseModelViewSet):
    queryset = CycleCountLine.objects.select_related("cycle_count", "item", "lot")
    serializer_class = CycleCountLineSerializer
    filterset_class = CycleCountLineFilter
    search_fields = ("custom_id", "cycle_count__count_number", "item__sku", "item__name", "lot__lot_number")


VIEWSET_MAP = {
    "cycle_count": CycleCountViewSet,
    "cycle_count_line": CycleCountLineViewSet,
    "goods_receipt": GoodsReceiptViewSet,
    "goods_receipt_line": GoodsReceiptLineViewSet,
    "item": WarehouseItemViewSet,
    "item_category": WarehouseItemCategoryViewSet,
    "lot": WarehouseLotViewSet,
    "pick_list": PickListViewSet,
    "pick_list_line": PickListLineViewSet,
    "purchase_order": PurchaseOrderViewSet,
    "purchase_order_line": PurchaseOrderLineViewSet,
    "replenishment_plan": ReplenishmentPlanViewSet,
    "replenishment_suggestion": ReplenishmentSuggestionViewSet,
    "sales_order": SalesOrderViewSet,
    "sales_order_line": SalesOrderLineViewSet,
    "shipment": ShipmentViewSet,
    "shipment_line": ShipmentLineViewSet,
    "stock_level": StockLevelViewSet,
    "stock_movement": StockMovementViewSet,
    "stock_reservation": StockReservationViewSet,
    "stock_transfer": StockTransferViewSet,
    "stock_transfer_line": StockTransferLineViewSet,
    "storage_location": StorageLocationViewSet,
    "warehouse": WarehouseViewSet,
}
