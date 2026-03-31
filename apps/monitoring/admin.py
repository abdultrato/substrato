from django.contrib import admin

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


