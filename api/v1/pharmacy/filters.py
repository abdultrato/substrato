import django_filters

from api.core.filters import SafeFilterSet
from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.material_requisition import MaterialRequisition
from apps.pharmacy.models.material_requisition_item import MaterialRequisitionItem
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ParentCategory, ProductCategory
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
            "position",
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
    # Filtros derivados usados pela UI de movimentos (setor via requisição,
    # intervalo de datas e produto do lote).
    sector = django_filters.CharFilter(
        field_name="material_request_item__requisition__sector",
        lookup_expr="exact",
    )
    date_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    product = django_filters.NumberFilter(field_name="lot__product_id", lookup_expr="exact")

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
# REQUISIÇÃO DE MATERIAL (LOGÍSTICA INTERNA)
# =====================================================


class MaterialRequisitionFilter(SafeFilterSet):
    class Meta:
        model = MaterialRequisition
        fields = [
            "tenant",
            "custom_id",
            "position",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "sector",
            "requested_by_department",
            "status",
            "fulfilled_at",
            "fulfilled_by",
            "on_hold_at",
            "on_hold_by",
        ]


class MaterialRequisitionItemFilter(SafeFilterSet):
    class Meta:
        model = MaterialRequisitionItem
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "requisition",
            "lot",
            "requested_quantity",
            "supplied_quantity",
        ]


# =====================================================
# CATEGORIES
# =====================================================


class ParentCategoryFilter(SafeFilterSet):
    class Meta:
        model = ParentCategory
        fields = ["tenant", "custom_id", "name", "deleted", "created_at", "updated_at"]


class ProductCategoryFilter(SafeFilterSet):
    class Meta:
        model = ProductCategory
        fields = ["tenant", "custom_id", "name", "parent_category", "deleted", "created_at", "updated_at"]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "sale_item": SaleItemFilter,
    "lot": LotFilter,
    "inventory_movement": InventoryMovementFilter,
    "product": ProductFilter,
    "material_requisition": MaterialRequisitionFilter,
    "material_requisition_item": MaterialRequisitionItemFilter,
    "sale": SaleFilter,
    "parent-categories": ParentCategoryFilter,
    "product-categories": ProductCategoryFilter,
}

