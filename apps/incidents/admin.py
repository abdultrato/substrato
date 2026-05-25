from django.contrib import admin

from .models.incident import Incident


@admin.register(Incident)
class OcorrenciaAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "equipment",
        "date",
        "type",
        "requires_maintenance",
        "maintenance_status",
        "resolved",
        "created_at",
    )
    list_filter = (
        "type",
        "requires_maintenance",
        "resolved",
        "date",
    )
    search_fields = (
        "custom_id",
        "equipment__name",
        "equipment__serial_number",
        "description",
        "post_incident_actions",
        "support_contact",
    )
    readonly_fields = (
        "maintenance_status",
        "maintenance_requested_at",
        "maintenance_completed_at",
    )
    ordering = ("-date",)  # Incidentes mais recentes primeiro

    @admin.display(description="Estado da manutenção")
    def maintenance_status(self, obj: Incident) -> str:
        return obj.maintenance_status
