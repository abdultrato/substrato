from django.contrib import admin

from .models.pregnancy import Pregnancy


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


@admin.register(Pregnancy)
class GestacaoAdmin(CoreAdmin):
    list_display = (
        "criado_em",
        "paciente",
        "medico_responsavel",
        "estado",
        "data_prevista_parto",
    )
    list_filter = ("estado",)
    search_fields = ("paciente__nome", "medico_responsavel__nome")
    ordering = ("-criado_em", "-id")
