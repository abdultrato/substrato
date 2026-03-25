from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem

from ..filters import InventoryMovementFilter, LotFilter, ProductFilter, SaleFilter, SaleItemFilter
from ..serializers import (
    InventoryMovementSerializer,
    LotSerializer,
    ProductSerializer,
    SaleItemSerializer,
    SaleSerializer,
)


class SaleItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SaleItem.objects.all()
    serializer_class = SaleItemSerializer
    filterset_class = SaleItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "product__name", "sale__number"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "sale",
        "product",
        "quantity",
        "unit_price",
        "version",
    ]
    ordering = ["-created_at"]


class LotViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Lot.objects.all()
    serializer_class = LotSerializer
    filterset_class = LotFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "lot_number", "product__name"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "product",
        "lot_number",
        "expiration_date",
        "initial_quantity",
        "version",
    ]
    ordering = ["-created_at"]


class InventoryMovementViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InventoryMovement.objects.all()
    serializer_class = InventoryMovementSerializer
    filterset_class = InventoryMovementFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "type", "origin", "lot__lot_number", "sale_item__custom_id"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "lot",
        "type",
        "origin",
        "sale_item",
        "quantity",
        "version",
    ]
    ordering = ["-created_at"]


class ProductViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "type"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "type",
        "sale_price",
        "vat_percentage",
        "category",
        "version",
    ]
    ordering = ["-created_at"]


class SaleViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    filterset_class = SaleFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "number", "patient__custom_id", "patient__name"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "number",
        "patient",
        "invoice",
        "total",
        "version",
    ]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "itemvenda": SaleItemViewSet,
    "lot": LotViewSet,
    "movimentoestoque": InventoryMovementViewSet,
    "product": ProductViewSet,
    "sale": SaleViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "InventoryMovementViewSet",
    "LotViewSet",
    "ProductViewSet",
    "SaleItemViewSet",
    "SaleViewSet",
]

