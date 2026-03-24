from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.pharmacy.models.sale_item import SaleItem
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale

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
    search_fields = ["id_custom", "nome", "produto__nome", "venda__numero"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "venda",
        "produto",
        "quantidade",
        "preco_unitario",
        "versao",
    ]
    ordering = ["-criado_em"]


class LotViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Lot.objects.all()
    serializer_class = LotSerializer
    filterset_class = LotFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "numero_lote", "produto__nome"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "produto",
        "numero_lote",
        "validade",
        "quantidade_inicial",
        "versao",
    ]
    ordering = ["-criado_em"]


class InventoryMovementViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InventoryMovement.objects.all()
    serializer_class = InventoryMovementSerializer
    filterset_class = InventoryMovementFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "tipo", "origem", "lote__numero_lote", "item_venda__id_custom"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "lote",
        "tipo",
        "origem",
        "item_venda",
        "quantidade",
        "versao",
    ]
    ordering = ["-criado_em"]


class ProductViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "tipo"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "tipo",
        "preco_venda",
        "iva_percentual",
        "categoria",
        "versao",
    ]
    ordering = ["-criado_em"]


class SaleViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    filterset_class = SaleFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "numero", "paciente__id_custom", "paciente__nome"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "numero",
        "paciente",
        "fatura",
        "total",
        "versao",
    ]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "itemvenda": SaleItemViewSet,
    "lote": LotViewSet,
    "movimentoestoque": InventoryMovementViewSet,
    "produto": ProductViewSet,
    "venda": SaleViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "SaleItemViewSet",
    "LotViewSet",
    "InventoryMovementViewSet",
    "ProductViewSet",
    "SaleViewSet",
]

ItemVendaViewSet = SaleItemViewSet
LoteViewSet = LotViewSet
MovimentoEstoqueViewSet = InventoryMovementViewSet
ProdutoViewSet = ProductViewSet
VendaViewSet = SaleViewSet
