from django.contrib import admin

from .models.outbox_event import TransactionalOutboxEvent
from .models.system_error import SystemError


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(SystemError)
class SystemErrorAdmin(CoreAdmin):
    list_display = (
        "created_at",
        "status_code",
        "exception_class",
        "path",
        "user",
    )
    list_filter = ("status_code", "exception_class")
    search_fields = ("path", "message", "exception_class", "user__username")
    ordering = ("-created_at", "-id")  # Erros mais recentes primeiro


@admin.register(TransactionalOutboxEvent)
class TransactionalOutboxEventAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "event_type",
        "tenant_identifier",
        "status",
        "attempts",
        "available_at",
        "published_at",
    )
    list_filter = ("status", "event_type")
    search_fields = ("event_type", "event_id", "tenant_identifier", "idempotency_key", "trace_id")
    readonly_fields = (
        "event_id",
        "created_at",
        "updated_at",
        "published_at",
        "last_error",
        "payload",
        "event_type",
        "tenant_identifier",
        "trace_id",
        "idempotency_key",
    )
    ordering = ("status", "available_at", "id")
