from rest_framework import serializers

from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.movimento import MovimentoEstoque
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.venda import Venda


class ItemVendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemVenda
        fields = "__all__"


class LoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lote
        fields = "__all__"


class MovimentoEstoqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimentoEstoque
        fields = "__all__"


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = "__all__"


class VendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venda
        fields = "__all__"


SERIALIZER_MAP = {
    "itemvenda": ItemVendaSerializer,
    "lote": LoteSerializer,
    "movimentoestoque": MovimentoEstoqueSerializer,
    "produto": ProdutoSerializer,
    "venda": VendaSerializer,
}
