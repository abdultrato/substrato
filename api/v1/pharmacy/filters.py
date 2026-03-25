from api.core.filters import SafeFilterSet
from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem

# =====================================================
# SALE ITEMS
# =====================================================


class SaleItemFilter(SafeFilterSet):
    class Meta:
        model = SaleItem
        fields = [
            "tenant",
            "custom_id",
            "description",
            "name",
            "order",
            "active",
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
        ]


# =====================================================
# LOTS
# =====================================================


class LotFilter(SafeFilterSet):
    class Meta:
        model = Lot
        fields = [
            "tenant",
            "custom_id",
            "description",
            "name",
            "order",
            "active",
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
        ]


# =====================================================
# INVENTORY MOVEMENTS
# =====================================================


class InventoryMovementFilter(SafeFilterSet):
    class Meta:
        model = InventoryMovement
        fields = [
            "tenant",
            "custom_id",
            "description",
            "name",
            "order",
            "active",
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
        ]


# =====================================================
# PRODUCTS
# =====================================================


class ProductFilter(SafeFilterSet):
    class Meta:
        model = Product
        fields = [
            "tenant",
            "custom_id",
            "description",
            "name",
            "order",
            "active",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "type",
            "sale_price",
        ]


# =====================================================
# SALES
# =====================================================


class SaleFilter(SafeFilterSet):
    class Meta:
        model = Sale
        fields = [
            "tenant",
            "custom_id",
            "description",
            "name",
            "order",
            "active",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "number",
            "patient",
            "total",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "itemvenda": SaleItemFilter,
    "lot": LotFilter,
    "movimentoestoque": InventoryMovementFilter,
    "product": ProductFilter,
    "sale": SaleFilter,
}

