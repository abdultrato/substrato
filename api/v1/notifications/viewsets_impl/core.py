from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate

from ..filters import DeliveryLogFilter, NotificationFilter, NotificationTemplateFilter
from ..serializers import DeliveryLogSerializer, NotificationSerializer, NotificationTemplateSerializer


class DeliveryLogViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DeliveryLog.objects.select_related("notification").all()
    serializer_class = DeliveryLogSerializer
    filterset_class = DeliveryLogFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["status", "response", "notification__recipient", "notification__external_reference"]
    ordering_fields = ["notification", "status", "response", "created_at"]
    ordering = ["-created_at"]


class NotificationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Notification.objects.select_related("patient").all()
    serializer_class = NotificationSerializer
    filterset_class = NotificationFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "recipient",
        "channel",
        "subject",
        "event_type",
        "external_reference",
        "message",
        "send_error",
        "patient__name",
        "patient__document_number",
    ]
    ordering_fields = [
        "recipient",
        "channel",
        "subject",
        "event_type",
        "external_reference",
        "message",
        "sent",
        "sent_at",
        "created_at",
    ]
    ordering = ["-created_at"]


class NotificationTemplateViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    filterset_class = NotificationTemplateFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "content"]
    ordering_fields = ["name", "content", "created_at"]
    ordering = ["name"]


VIEWSET_MAP = {
    "logenvio": DeliveryLogViewSet,
    "notification": NotificationViewSet,
    "template": NotificationTemplateViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DeliveryLogViewSet",
    "NotificationTemplateViewSet",
    "NotificationViewSet",
]

