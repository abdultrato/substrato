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
    search_fields = ["status", "response"]
    ordering_fields = ["notification", "status", "response", "created_at"]
    ordering = ["-created_at"]


class NotificationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    filterset_class = NotificationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["recipient", "channel", "message"]
    ordering_fields = ["recipient", "channel", "message", "sent", "created_at"]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "logenvio": DeliveryLogViewSet,
    "notification": NotificationViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DeliveryLogViewSet",
    "NotificationViewSet",
]

