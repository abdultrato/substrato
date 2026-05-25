from django.contrib import admin

from .models.maintenance import Maintenance


@admin.register(Maintenance)
class ManutencaoAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "incident",
        "equipment",
        "maintenance_type",
        "type",
        "scheduled_date",
        "performed_date",
        "technician",
        "created_at",
    )
    list_filter = (
        "maintenance_type",
        "type",
        "scheduled_date",
        "performed_date",
    )
    search_fields = (
        "custom_id",
        "incident__custom_id",
        "incident__description",
        "equipment__name",
        "equipment__serial_number",
        "technician",
        "description",
    )
    readonly_fields = (
        "incident_context",
    )
    ordering = ("-scheduled_date",)  # Próximas/mais recentes primeiro

    @admin.display(description="Contexto da ocorrência")
    def incident_context(self, obj: Maintenance) -> str:
        incident = obj.incident
        if not incident:
            return "-"
        parts = [
            f"Ocorrência: {incident.custom_id}",
            f"Tipo: {incident.get_type_display()}",
            f"Data: {incident.date:%Y-%m-%d %H:%M}",
            f"Descrição: {incident.description}",
        ]
        if incident.support_contact:
            parts.append(f"Contacto: {incident.support_contact}")
        if incident.post_incident_actions:
            parts.append(f"Ações após ocorrência: {incident.post_incident_actions}")
        return "\n".join(parts)
