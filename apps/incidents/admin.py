from django.contrib import admin

from .models.incident import Incident


@admin.register(Incident)
class OcorrenciaAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "equipment",
        "date",
        "type",
        "resolved",
        "created_at",
    )
    list_filter = (
        "type",
        "resolved",
        "date",
    )
    search_fields = (
        "custom_id",
        "equipment__name",
        "equipment__serial_number",
        "description",
        "support_contact",
    )
    ordering = ("-date",)  # Incidentes mais recentes primeiro
