from django.contrib import admin

from .models.equipment import Equipment


@admin.register(Equipment)
class EquipamentoAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "name",
        "serial_number",
        "manufacturer",
        "model",
        "location",
        "responsible",
        "status_atual",
        "active",
        "created_at",
    )
    list_filter = (
        "active",
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
    def status_atual(self, obj: Equipment) -> str:
        return obj.status_atual_label or obj.status_atual or ""
