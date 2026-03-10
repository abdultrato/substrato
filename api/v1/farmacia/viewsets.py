from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.movimento import MovimentoEstoque
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.venda import Venda
from .filters import *
from .serializers import *

class ItemVendaViewSet(ModelViewSet):
    queryset = ItemVenda.objects.all()
    serializer_class = ItemVendaSerializer
    filterset_class = ItemVendaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'venda', 'produto', 'quantidade', 'preco_unitario']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class LoteViewSet(ModelViewSet):
    queryset = Lote.objects.all()
    serializer_class = LoteSerializer
    filterset_class = LoteFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'numero_lote']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'produto', 'numero_lote', 'validade', 'quantidade_inicial']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class MovimentoEstoqueViewSet(ModelViewSet):
    queryset = MovimentoEstoque.objects.all()
    serializer_class = MovimentoEstoqueSerializer
    filterset_class = MovimentoEstoqueFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'tipo', 'origem']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'lote', 'tipo', 'origem', 'item_venda', 'quantidade']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class ProdutoViewSet(ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    filterset_class = ProdutoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'tipo']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'tipo', 'preco_venda']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class VendaViewSet(ModelViewSet):
    queryset = Venda.objects.all()
    serializer_class = VendaSerializer
    filterset_class = VendaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'numero', 'descricao']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'numero', 'total']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

VIEWSET_MAP = {
    'itemvenda': ItemVendaViewSet,
    'lote': LoteViewSet,
    'movimentoestoque': MovimentoEstoqueViewSet,
    'produto': ProdutoViewSet,
    'venda': VendaViewSet,
}

__all__ = [
    'ItemVendaViewSet',
    'LoteViewSet',
    'MovimentoEstoqueViewSet',
    'ProdutoViewSet',
    'VendaViewSet',
    'VIEWSET_MAP',
]
