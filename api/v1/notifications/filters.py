import django_filters

from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification


class LogEnvioFilter(django_filters.FilterSet):
    class Meta:
        model = DeliveryLog
        fields = ["notificacao", "status", "resposta", "criado_em"]


class NotificacaoFilter(django_filters.FilterSet):
    class Meta:
        model = Notification
        fields = ["destinatario", "canal", "mensagem", "enviada", "criado_em"]


FILTER_MAP = {
    "logenvio": LogEnvioFilter,
    "notificacao": NotificacaoFilter,
}
