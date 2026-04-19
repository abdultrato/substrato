from django.contrib import admin

from .models.delivery_log import DeliveryLog
from .models.notification import Notification
from .models.notification_template import NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "event_type",
        "channel",
        "recipient",
        "patient",
        "sent",
        "sent_at",
        "created_at",
    )
    list_filter = ("event_type", "channel", "sent", "created_at")
    search_fields = (
        "recipient",
        "subject",
        "message",
        "external_reference",
        "patient__name",
        "patient__custom_id",
    )
    readonly_fields = ("created_at", "sent_at")
    ordering = ("-created_at",)  # Notificações mais recentes primeiro


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name", "content")
    readonly_fields = ("created_at",)
    ordering = ("name",)


@admin.register(DeliveryLog)
class DeliveryLogAdmin(admin.ModelAdmin):
    list_display = ("id", "notification", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("notification__recipient", "status", "response")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)  # Logs mais recentes primeiro


