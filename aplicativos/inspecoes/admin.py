from django.contrib import admin

from .modelos.inspecao_diaria import InspecaoDiaria


@admin.register(InspecaoDiaria)
class InspecaoDiariaAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "equipamento",
        "data",
        "funcionamento",
        "limpeza_realizada",
        "criado_em",
    )
    list_filter = (
        "funcionamento",
        "limpeza_realizada",
        "data",
    )
    search_fields = (
        "id_custom",
        "equipamento__nome",
        "equipamento__numero_serie",
    )
    ordering = ("-data",)
