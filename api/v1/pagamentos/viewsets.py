from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.pagamentos.modelos.reconciliacao import Reconciliacao
from aplicativos.pagamentos.modelos.transacao import Transacao
from .filters import *
from .serializers import *

class PagamentoViewSet(ModelViewSet):
    queryset = Pagamento.objects.all()
    serializer_class = PagamentoSerializer
    filterset_class = PagamentoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'metodo', 'status', 'referencia_externa']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'fatura', 'valor', 'metodo', 'status', 'referencia_externa', 'pago_em']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class ReciboViewSet(ModelViewSet):
    queryset = Recibo.objects.all()
    serializer_class = ReciboSerializer
    filterset_class = ReciboFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['numero']
    ordering_fields = ['fatura', 'pagamento', 'numero', 'valor', 'criado_em']
    ordering = ['-criado_em']

class ReconciliacaoViewSet(ModelViewSet):
    queryset = Reconciliacao.objects.all()
    serializer_class = ReconciliacaoSerializer
    filterset_class = ReconciliacaoFilter
    permission_classes = [IsAuthenticated]
    search_fields = []
    ordering_fields = ['transacao', 'confirmado', 'data_confirmacao', 'criado_em']
    ordering = ['-criado_em']

class TransacaoViewSet(ModelViewSet):
    queryset = Transacao.objects.all()
    serializer_class = TransacaoSerializer
    filterset_class = TransacaoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['referencia_externa', 'gateway', 'status']
    ordering_fields = ['referencia_externa', 'gateway', 'status', 'resposta_gateway', 'criado_em']
    ordering = ['-criado_em']

VIEWSET_MAP = {
    'pagamento': PagamentoViewSet,
    'recibo': ReciboViewSet,
    'reconciliacao': ReconciliacaoViewSet,
    'transacao': TransacaoViewSet,
}

__all__ = [
    'PagamentoViewSet',
    'ReciboViewSet',
    'ReconciliacaoViewSet',
    'TransacaoViewSet',
    'VIEWSET_MAP',
]
