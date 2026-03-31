import django_filters

from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification


class DeliveryLogFilter(django_filters.FilterSet):
    class Meta:
        model = DeliveryLog
        fields = ["notification", "status", "response", "created_at"]  # Filtros permitidos


class NotificationFilter(django_filters.FilterSet):
    class Meta:
        model = Notification
        fields = ["recipient", "channel", "message", "sent", "created_at"]  # Filtros permitidos


FILTER_MAP = {
    "logenvio": DeliveryLogFilter,
    "notification": NotificationFilter,
}

