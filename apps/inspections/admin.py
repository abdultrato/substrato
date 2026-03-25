from django.contrib import admin

from .models.daily_inspection import DailyInspection


@admin.register(DailyInspection)
class InspecaoDiariaAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "equipment",
        "date",
        "operation_status",
        "cleaning_performed",
        "created_at",
    )
    list_filter = (
        "operation_status",
        "cleaning_performed",
        "date",
    )
    search_fields = (
        "custom_id",
        "equipment__name",
        "equipment__serial_number",
    )
    ordering = ("-date",)
