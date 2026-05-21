from api.core.filters import SafeFilterSet
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


class IntegrationEquipmentFilter(SafeFilterSet):
    class Meta:
        model = IntegrationEquipment
        fields = [
            "tenant",
            "custom_id",
            "name",
            "modality",
            "protocol",
            "manufacturer",
            "model",
            "serial_number",
            "active",
            "deleted",
            "created_at",
            "updated_at",
        ]


class IntegrationCredentialFilter(SafeFilterSet):
    class Meta:
        model = IntegrationCredential
        fields = [
            "tenant",
            "custom_id",
            "equipment",
            "label",
            "key_prefix",
            "key_last4",
            "active",
            "revoked_at",
            "deleted",
            "created_at",
            "updated_at",
        ]


class IntegrationRoutingFilter(SafeFilterSet):
    class Meta:
        model = IntegrationRouting
        fields = [
            "tenant",
            "custom_id",
            "equipment",
            "exam_type",
            "sector",
            "active",
            "deleted",
            "created_at",
            "updated_at",
        ]


class IntegrationOrderFilter(SafeFilterSet):
    class Meta:
        model = IntegrationOrder
        fields = [
            "tenant",
            "custom_id",
            "equipment",
            "request",
            "status",
            "deleted",
            "created_at",
            "updated_at",
        ]


class IntegrationOrderItemFilter(SafeFilterSet):
    class Meta:
        model = IntegrationOrderItem
        fields = [
            "tenant",
            "custom_id",
            "order",
            "request_item",
            "status",
            "deleted",
            "created_at",
            "updated_at",
        ]


class IntegrationMessageFilter(SafeFilterSet):
    class Meta:
        model = IntegrationMessage
        fields = [
            "tenant",
            "custom_id",
            "equipment",
            "order",
            "direction",
            "protocol",
            "message_id",
            "content_type",
            "sha256",
            "status",
            "processed_at",
            "deleted",
            "created_at",
            "updated_at",
        ]


class IntegrationDocumentFilter(SafeFilterSet):
    class Meta:
        model = IntegrationDocument
        fields = [
            "tenant",
            "custom_id",
            "message",
            "order_item",
            "filename",
            "content_type",
            "sha256",
            "deleted",
            "created_at",
            "updated_at",
        ]


class IntegrationAnalyteMappingFilter(SafeFilterSet):
    class Meta:
        model = IntegrationAnalyteMapping
        fields = [
            "tenant",
            "custom_id",
            "equipment",
            "code",
            "exam_field",
            "unit_override",
            "active",
            "deleted",
            "created_at",
            "updated_at",
        ]


FILTER_MAP = {
    "equipment": IntegrationEquipmentFilter,
    "credential": IntegrationCredentialFilter,
    "routing": IntegrationRoutingFilter,
    "order": IntegrationOrderFilter,
    "order_item": IntegrationOrderItemFilter,
    "message": IntegrationMessageFilter,
    "document": IntegrationDocumentFilter,
    "analyte_mapping": IntegrationAnalyteMappingFilter,
}
