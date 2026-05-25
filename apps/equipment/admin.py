"""Configuração do Django Admin para equipamentos."""

from django.contrib import admin

from .models.equipment import Equipment


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    """Lista equipamentos com estado operacional e filtros de aquisição."""
    list_display = (
        "custom_id",
        "name",
        "serial_number",
        "manufacturer",
        "model",
        "location",
        "responsible",
        "current_status",
        "requires_maintenance",
        "active",
        "created_at",
    )
    list_filter = (
        "active",
        "requires_maintenance",
        "acquisition_status",
        "initial_operational_status",
    )
    search_fields = (
        "custom_id",
        "name",
        "serial_number",
        "manufacturer",
        "model",
        "location",
        "responsible",
    )
    ordering = ("name",)

    @admin.display(description="Estado atual")
    def current_status(self, obj: Equipment) -> str:
        return obj.current_status_label or obj.current_status or ""
