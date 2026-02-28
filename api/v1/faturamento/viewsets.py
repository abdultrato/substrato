from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura
from .filters import *
from .serializers import *

class FaturaViewSet(ModelViewSet):
    queryset = Fatura.objects.all()
    serializer_class = FaturaSerializer
    filterset_class = FaturaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'estado']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'requisicao', 'paciente', 'subtotal', 'iva_valor', 'total', 'valor_seguro', 'valor_paciente', 'estado']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class FaturaItemViewSet(ModelViewSet):
    queryset = FaturaItem.objects.all()
    serializer_class = FaturaItemSerializer
    filterset_class = FaturaItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao']
    ordering_fields = ['inquilino', 'id_custom', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'fatura', 'exame', 'descricao', 'quantidade', 'preco_unitario', 'isento_iva']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class HistoricoFaturaViewSet(ModelViewSet):
    queryset = HistoricoFatura.objects.all()
    serializer_class = HistoricoFaturaSerializer
    filterset_class = HistoricoFaturaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['descricao', 'tipo_evento']
    ordering_fields = ['fatura', 'descricao', 'tipo_evento', 'criado_em']
    ordering = ['-criado_em']

VIEWSET_MAP = {
    'fatura': FaturaViewSet,
    'faturaitem': FaturaItemViewSet,
    'historicofatura': HistoricoFaturaViewSet,
}

__all__ = [
    'FaturaViewSet',
    'FaturaItemViewSet',
    'HistoricoFaturaViewSet',
    'VIEWSET_MAP',
]
