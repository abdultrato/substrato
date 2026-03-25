from django.contrib import admin

from .models import (
    IntegrationAnalyteMapping,
    IntegrationCredential,
    IntegrationDocument,
    IntegrationEquipment,
    IntegrationMessage,
    IntegrationOrder,
    IntegrationOrderItem,
    IntegrationRouting,
)


@admin.register(IntegrationEquipment)
class IntegrationEquipmentAdmin(admin.ModelAdmin):
    list_display = ("id", "custom_id", "name", "modality", "protocol", "active", "tenant")
    list_filter = ("modality", "protocol", "active", "tenant")
    search_fields = ("custom_id", "name", "manufacturer", "model", "serial_number")


@admin.register(IntegrationCredential)
class IntegrationCredentialAdmin(admin.ModelAdmin):
    list_display = ("id", "custom_id", "equipment", "label", "key_prefix", "key_last4", "active", "revoked_at")
    list_filter = ("active", "equipment")
    search_fields = ("custom_id", "label", "key_prefix", "key_last4")
    readonly_fields = ("key_hash", "key_prefix", "key_last4", "created_at", "updated_at")


@admin.register(IntegrationRouting)
class IntegrationRoutingAdmin(admin.ModelAdmin):
    list_display = ("id", "custom_id", "equipment", "exam_type", "sector", "active", "tenant")
    list_filter = ("exam_type", "sector", "active", "tenant")
    search_fields = ("custom_id",)


class IntegrationOrderItemInline(admin.TabularInline):
    model = IntegrationOrderItem
    extra = 0


@admin.register(IntegrationOrder)
class IntegrationOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "custom_id", "equipment", "request", "status", "tenant", "created_at")
    list_filter = ("status", "equipment", "tenant")
    search_fields = ("custom_id", "request__custom_id")
    inlines = (IntegrationOrderItemInline,)


@admin.register(IntegrationMessage)
class IntegrationMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "custom_id", "equipment", "order", "direction", "protocol", "status", "created_at")
    list_filter = ("status", "direction", "protocol", "equipment")
    search_fields = ("custom_id", "message_id", "sha256")
    readonly_fields = ("sha256", "payload_raw", "payload_json", "created_at", "updated_at")


@admin.register(IntegrationDocument)
class IntegrationDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "custom_id", "message", "order_item", "filename", "content_type", "sha256", "created_at")
    list_filter = ("content_type",)
    search_fields = ("custom_id", "filename", "sha256")


@admin.register(IntegrationAnalyteMapping)
class IntegrationAnalyteMappingAdmin(admin.ModelAdmin):
    list_display = ("id", "custom_id", "equipment", "code", "exam_field", "active", "tenant")
    list_filter = ("equipment", "active", "tenant")
    search_fields = ("custom_id", "code", "exam_field__name", "equipment__name")


IntegracaoOrdemItemInline = IntegrationOrderItemInline
