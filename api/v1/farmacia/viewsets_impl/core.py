from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.movimento import MovimentoEstoque
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.venda import Venda

from ..filters import ItemVendaFilter, LoteFilter, MovimentoEstoqueFilter, ProdutoFilter, VendaFilter
from ..serializers import (
    ItemVendaSerializer,
    LoteSerializer,
    MovimentoEstoqueSerializer,
    ProdutoSerializer,
    VendaSerializer,
)


class ItemVendaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ItemVenda.objects.all()
    serializer_class = ItemVendaSerializer
    filterset_class = ItemVendaFilter
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


class LoteViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Lote.objects.all()
    serializer_class = LoteSerializer
    filterset_class = LoteFilter
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


class MovimentoEstoqueViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MovimentoEstoque.objects.all()
    serializer_class = MovimentoEstoqueSerializer
    filterset_class = MovimentoEstoqueFilter
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


class ProdutoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    filterset_class = ProdutoFilter
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


class VendaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Venda.objects.all()
    serializer_class = VendaSerializer
    filterset_class = VendaFilter
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
    "itemvenda": ItemVendaViewSet,
    "lote": LoteViewSet,
    "movimentoestoque": MovimentoEstoqueViewSet,
    "produto": ProdutoViewSet,
    "venda": VendaViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "ItemVendaViewSet",
    "LoteViewSet",
    "MovimentoEstoqueViewSet",
    "ProdutoViewSet",
    "VendaViewSet",
]
