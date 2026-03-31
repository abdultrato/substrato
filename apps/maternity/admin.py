from django.contrib import admin

from .models.pregnancy import Pregnancy


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(Pregnancy)
class PregnancyAdmin(CoreAdmin):
    list_display = (
        "created_at",
        "patient",
        "responsible_doctor",
        "status",
        "expected_delivery_date",
    )
    list_filter = ("status",)
    search_fields = ("patient__name", "responsible_doctor__name")
    ordering = ("-created_at", "-id")  # Registos mais recentes primeiro


