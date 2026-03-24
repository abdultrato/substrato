from django.contrib import admin

from .models.incident import Incident


@admin.register(Incident)
class OcorrenciaAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "equipamento",
        "data",
        "tipo",
        "resolvido",
        "criado_em",
    )
    list_filter = (
        "tipo",
        "resolvido",
        "data",
    )
    search_fields = (
        "id_custom",
        "equipamento__nome",
        "equipamento__numero_serie",
        "descricao",
        "contacto_assistencia",
    )
    ordering = ("-data",)
