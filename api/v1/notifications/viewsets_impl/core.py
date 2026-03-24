from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification

from ..filters import DeliveryLogFilter, NotificationFilter
from ..serializers import DeliveryLogSerializer, NotificationSerializer


class DeliveryLogViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DeliveryLog.objects.all()
    serializer_class = DeliveryLogSerializer
    filterset_class = DeliveryLogFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["status", "resposta"]
    ordering_fields = ["notificacao", "status", "resposta", "criado_em"]
    ordering = ["-criado_em"]


class NotificationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    filterset_class = NotificationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["destinatario", "canal", "mensagem"]
    ordering_fields = ["destinatario", "canal", "mensagem", "enviada", "criado_em"]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "logenvio": DeliveryLogViewSet,
    "notificacao": NotificationViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DeliveryLogViewSet",
    "NotificationViewSet",
]

LogEnvioViewSet = DeliveryLogViewSet
NotificacaoViewSet = NotificationViewSet
