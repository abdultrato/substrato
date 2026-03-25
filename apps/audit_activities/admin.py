from django.contrib import admin

from .models.user_activity import UserActivity


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(UserActivity)
class UserActivityAdmin(CoreAdmin):
    list_display = (
        "created_at",
        "user",
        "method",
        "path",
        "status_code",
        "duration_ms",
        "view_basename",
        "view_action",
    )
    list_filter = ("method", "status_code", "view_basename")
    search_fields = ("path", "full_path", "user__username", "message")
    ordering = ("-created_at", "-id")


AtividadeUsuarioAdmin = UserActivityAdmin
