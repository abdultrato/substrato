from api.core.filters import SafeFilterSet
from apps.pharmacy.models.sale_item import SaleItem
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale

# =====================================================
# ITEM VENDA
# =====================================================


class ItemVendaFilter(SafeFilterSet):
    class Meta:
        model = SaleItem
        fields = [
            "inquilino",
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "ativo",
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
        ]


# =====================================================
# LOTE
# =====================================================


class LoteFilter(SafeFilterSet):
    class Meta:
        model = Lot
        fields = [
            "inquilino",
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "ativo",
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
        ]


# =====================================================
# MOVIMENTO ESTOQUE
# =====================================================


class MovimentoEstoqueFilter(SafeFilterSet):
    class Meta:
        model = InventoryMovement
        fields = [
            "inquilino",
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "ativo",
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
        ]


# =====================================================
# PRODUTO
# =====================================================


class ProdutoFilter(SafeFilterSet):
    class Meta:
        model = Product
        fields = [
            "inquilino",
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "ativo",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "tipo",
            "preco_venda",
        ]


# =====================================================
# VENDA
# =====================================================


class VendaFilter(SafeFilterSet):
    class Meta:
        model = Sale
        fields = [
            "inquilino",
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "ativo",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "numero",
            "paciente",
            "total",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "itemvenda": ItemVendaFilter,
    "lote": LoteFilter,
    "movimentoestoque": MovimentoEstoqueFilter,
    "produto": ProdutoFilter,
    "venda": VendaFilter,
}
