from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.notificacoes.modelos.log_envio import LogEnvio
from aplicativos.notificacoes.modelos.notificacao import Notificacao
from .filters import *
from .serializers import *

class LogEnvioViewSet(ModelViewSet):
    queryset = LogEnvio.objects.all()
    serializer_class = LogEnvioSerializer
    filterset_class = LogEnvioFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['status', 'resposta']
    ordering_fields = ['notificacao', 'status', 'resposta', 'criado_em']
    ordering = ['-criado_em']

class NotificacaoViewSet(ModelViewSet):
    queryset = Notificacao.objects.all()
    serializer_class = NotificacaoSerializer
    filterset_class = NotificacaoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['destinatario', 'canal', 'mensagem']
    ordering_fields = ['destinatario', 'canal', 'mensagem', 'enviada', 'criado_em']
    ordering = ['-criado_em']

VIEWSET_MAP = {
    'logenvio': LogEnvioViewSet,
    'notificacao': NotificacaoViewSet,
}

__all__ = [
    'LogEnvioViewSet',
    'NotificacaoViewSet',
    'VIEWSET_MAP',
]
