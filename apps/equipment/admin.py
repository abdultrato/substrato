from django.contrib import admin

from .models.equipment import Equipment


@admin.register(Equipment)
class EquipamentoAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "numero_serie",
        "fabricante",
        "modelo",
        "localizacao",
        "responsavel",
        "estado_atual",
        "ativo",
        "criado_em",
    )
    list_filter = (
        "ativo",
        "estado_aquisicao",
        "estado_operacional_inicial",
    )
    search_fields = (
        "id_custom",
        "nome",
        "numero_serie",
        "fabricante",
        "modelo",
        "localizacao",
        "responsavel",
    )
    ordering = ("nome",)

    @admin.display(description="Estado atual")
    def estado_atual(self, obj: Equipment) -> str:
        return obj.estado_atual_label or obj.estado_atual or ""
