from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification

from ..filters import LogEnvioFilter, NotificacaoFilter
from ..serializers import LogEnvioSerializer, NotificacaoSerializer


class LogEnvioViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DeliveryLog.objects.all()
    serializer_class = LogEnvioSerializer
    filterset_class = LogEnvioFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["status", "resposta"]
    ordering_fields = ["notificacao", "status", "resposta", "criado_em"]
    ordering = ["-criado_em"]


class NotificacaoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificacaoSerializer
    filterset_class = NotificacaoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["destinatario", "canal", "mensagem"]
    ordering_fields = ["destinatario", "canal", "mensagem", "enviada", "criado_em"]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "logenvio": LogEnvioViewSet,
    "notificacao": NotificacaoViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "LogEnvioViewSet",
    "NotificacaoViewSet",
]
