from rest_framework import serializers

from apps.pharmacy.models.sale_item import SaleItem
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale


class ItemVendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = "__all__"


class LoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lot
        fields = "__all__"


class MovimentoEstoqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryMovement
        fields = "__all__"


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class VendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = "__all__"


SERIALIZER_MAP = {
    "itemvenda": ItemVendaSerializer,
    "lote": LoteSerializer,
    "movimentoestoque": MovimentoEstoqueSerializer,
    "produto": ProdutoSerializer,
    "venda": VendaSerializer,
}
