from django.contrib import admin

from .models.maintenance import Maintenance


@admin.register(Maintenance)
class ManutencaoAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "equipamento",
        "tipo",
        "data_programada",
        "data_realizada",
        "tecnico",
        "criado_em",
    )
    list_filter = (
        "tipo",
        "data_programada",
        "data_realizada",
    )
    search_fields = (
        "id_custom",
        "equipamento__nome",
        "equipamento__numero_serie",
        "tecnico",
    )
    ordering = ("-data_programada",)
