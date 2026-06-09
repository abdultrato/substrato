from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.response import Response
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


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


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

    @action(detail=True, methods=["post"], url_path="marcar-enviada", url_name="marcar-enviada")
    def marcar_enviada(self, request, pk=None):
        notification = self.get_object()
        try:
            notification.mark_sent(external_reference=request.data.get("external_reference", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(notification).data)

    @action(detail=True, methods=["post"], url_path="marcar-falha", url_name="marcar-falha")
    def marcar_falha(self, request, pk=None):
        notification = self.get_object()
        try:
            notification.mark_failed(error=request.data.get("error", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(notification).data)


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

