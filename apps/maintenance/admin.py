from django.contrib import admin

from .models.maintenance import Maintenance


@admin.register(Maintenance)
class ManutencaoAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "equipment",
        "type",
        "scheduled_date",
        "performed_date",
        "technician",
        "created_at",
    )
    list_filter = (
        "type",
        "scheduled_date",
        "performed_date",
    )
    search_fields = (
        "custom_id",
        "equipment__name",
        "equipment__serial_number",
        "technician",
    )
    ordering = ("-scheduled_date",)
