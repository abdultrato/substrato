from api.core.filters import SafeFilterSet
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate


class DeliveryLogFilter(SafeFilterSet):
    class Meta:
        model = DeliveryLog
        fields = ["id", "notification", "status", "response", "created_at"]


class NotificationFilter(SafeFilterSet):
    class Meta:
        model = Notification
        fields = [
            "id",
            "patient",
            "recipient",
            "channel",
            "subject",
            "event_type",
            "external_reference",
            "message",
            "sent",
            "send_error",
            "sent_at",
            "created_at",
        ]


class NotificationTemplateFilter(SafeFilterSet):
    class Meta:
        model = NotificationTemplate
        fields = ["id", "name", "content", "created_at"]


FILTER_MAP = {
    "logenvio": DeliveryLogFilter,
    "notification": NotificationFilter,
    "template": NotificationTemplateFilter,
}

