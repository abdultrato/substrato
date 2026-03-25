from rest_framework import serializers

from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = "__all__"


class LotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lot
        fields = "__all__"


class InventoryMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryMovement
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = "__all__"


SERIALIZER_MAP = {
    "itemvenda": SaleItemSerializer,
    "lote": LotSerializer,
    "movimentoestoque": InventoryMovementSerializer,
    "produto": ProductSerializer,
    "venda": SaleSerializer,
}

ItemVendaSerializer = SaleItemSerializer
LoteSerializer = LotSerializer
MovimentoEstoqueSerializer = InventoryMovementSerializer
ProdutoSerializer = ProductSerializer
VendaSerializer = SaleSerializer
