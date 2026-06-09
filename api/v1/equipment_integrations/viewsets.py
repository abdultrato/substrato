from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.equipment_integrations.models import (
    IntegrationAnalyteMapping,
    IntegrationCredential,
    IntegrationDocument,
    IntegrationEquipment,
    IntegrationMessage,
    IntegrationOrder,
    IntegrationOrderItem,
    IntegrationRouting,
)

from .filters import (
    IntegrationAnalyteMappingFilter,
    IntegrationCredentialFilter,
    IntegrationDocumentFilter,
    IntegrationEquipmentFilter,
    IntegrationMessageFilter,
    IntegrationOrderFilter,
    IntegrationOrderItemFilter,
    IntegrationRoutingFilter,
)
from .serializers import (
    IntegrationAnalyteMappingSerializer,
    IntegrationCredentialSerializer,
    IntegrationDocumentSerializer,
    IntegrationEquipmentSerializer,
    IntegrationMessageSerializer,
    IntegrationOrderItemSerializer,
    IntegrationOrderSerializer,
    IntegrationRoutingSerializer,
)


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


class TenantScopedIntegrationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class IntegrationEquipmentViewSet(TenantScopedIntegrationViewSet):
    queryset = IntegrationEquipment.objects.all()
    serializer_class = IntegrationEquipmentSerializer
    filterset_class = IntegrationEquipmentFilter
    search_fields = [
        "custom_id",
        "name",
        "manufacturer",
        "model",
        "serial_number",
        "protocol",
        "modality",
        "tcp_host",
    ]
    ordering_fields = [
        "name",
        "modality",
        "protocol",
        "connection_mode",
        "tcp_host",
        "tcp_port",
        "last_seen_at",
        "serial_number",
        "active",
        "created_at",
        "updated_at",
    ]
    ordering = ["name", "-created_at"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        equipment = self.get_object()
        try:
            equipment.activate()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(equipment).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        equipment = self.get_object()
        try:
            equipment.deactivate()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(equipment).data)


class IntegrationCredentialViewSet(TenantScopedIntegrationViewSet):
    queryset = IntegrationCredential.objects.select_related("equipment").all()
    serializer_class = IntegrationCredentialSerializer
    filterset_class = IntegrationCredentialFilter
    search_fields = ["custom_id", "equipment__name", "equipment__serial_number", "label", "key_prefix", "key_last4"]
    ordering_fields = ["label", "active", "revoked_at", "created_at", "updated_at"]
    ordering = ["-created_at"]


class IntegrationRoutingViewSet(TenantScopedIntegrationViewSet):
    queryset = IntegrationRouting.objects.select_related("equipment").all()
    serializer_class = IntegrationRoutingSerializer
    filterset_class = IntegrationRoutingFilter
    search_fields = ["custom_id", "equipment__name", "equipment__serial_number", "sector", "exam_type"]
    ordering_fields = ["exam_type", "sector", "active", "created_at", "updated_at"]
    ordering = ["-created_at"]


class IntegrationOrderViewSet(TenantScopedIntegrationViewSet):
    queryset = IntegrationOrder.objects.select_related("equipment", "request", "request__patient").all()
    serializer_class = IntegrationOrderSerializer
    filterset_class = IntegrationOrderFilter
    search_fields = ["custom_id", "equipment__name", "equipment__serial_number", "request__custom_id", "request__patient__name"]
    ordering_fields = ["status", "created_at", "updated_at"]
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"], url_path="enviar", url_name="enviar")
    def enviar(self, request, pk=None):
        order = self.get_object()
        try:
            order.mark_sent()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        order = self.get_object()
        try:
            order.cancel(reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)


class IntegrationOrderItemViewSet(TenantScopedIntegrationViewSet):
    queryset = IntegrationOrderItem.objects.select_related("order", "order__equipment", "request_item").all()
    serializer_class = IntegrationOrderItemSerializer
    filterset_class = IntegrationOrderItemFilter
    search_fields = [
        "custom_id",
        "order__custom_id",
        "order__equipment__name",
        "order__equipment__serial_number",
        "request_item__custom_id",
    ]
    ordering_fields = ["position", "status", "created_at", "updated_at"]
    ordering = ["order", "position", "id"]


class IntegrationMessageViewSet(TenantScopedIntegrationViewSet):
    queryset = IntegrationMessage.objects.select_related("equipment", "order").all()
    serializer_class = IntegrationMessageSerializer
    filterset_class = IntegrationMessageFilter
    search_fields = ["custom_id", "equipment__name", "equipment__serial_number", "order__custom_id", "message_id", "sha256", "error"]
    ordering_fields = ["direction", "protocol", "status", "processed_at", "created_at", "updated_at"]
    ordering = ["-created_at"]


class IntegrationDocumentViewSet(TenantScopedIntegrationViewSet):
    queryset = IntegrationDocument.objects.select_related("message", "message__equipment", "order_item").all()
    serializer_class = IntegrationDocumentSerializer
    filterset_class = IntegrationDocumentFilter
    search_fields = ["custom_id", "message__custom_id", "message__message_id", "filename", "content_type", "sha256"]
    ordering_fields = ["filename", "content_type", "created_at", "updated_at"]
    ordering = ["-created_at"]


class IntegrationAnalyteMappingViewSet(TenantScopedIntegrationViewSet):
    queryset = IntegrationAnalyteMapping.objects.select_related("equipment", "exam_field").all()
    serializer_class = IntegrationAnalyteMappingSerializer
    filterset_class = IntegrationAnalyteMappingFilter
    search_fields = ["custom_id", "equipment__name", "equipment__serial_number", "code", "exam_field__name", "unit_override"]
    ordering_fields = ["code", "unit_override", "active", "created_at", "updated_at"]
    ordering = ["equipment", "code"]


VIEWSET_MAP = {
    "equipment": IntegrationEquipmentViewSet,
    "credential": IntegrationCredentialViewSet,
    "routing": IntegrationRoutingViewSet,
    "order": IntegrationOrderViewSet,
    "order_item": IntegrationOrderItemViewSet,
    "message": IntegrationMessageViewSet,
    "document": IntegrationDocumentViewSet,
    "analyte_mapping": IntegrationAnalyteMappingViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "IntegrationAnalyteMappingViewSet",
    "IntegrationCredentialViewSet",
    "IntegrationDocumentViewSet",
    "IntegrationEquipmentViewSet",
    "IntegrationMessageViewSet",
    "IntegrationOrderItemViewSet",
    "IntegrationOrderViewSet",
    "IntegrationRoutingViewSet",
]
