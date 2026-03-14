from django.contrib import admin

from .modelos.cirurgia import Cirurgia
from .modelos.procedimento_cirurgico import ProcedimentoCirurgico


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


@admin.register(Cirurgia)
class CirurgiaAdmin(CoreAdmin):
    list_display = (
        "agendada_para",
        "paciente",
        "cirurgiao",
        "procedimentos_lista",
        "estado",
    )
    list_filter = ("estado",)
    search_fields = ("procedimento", "paciente__nome", "cirurgiao__username", "procedimentos__nome")
    ordering = ("-agendada_para", "-criado_em")
    filter_horizontal = ("procedimentos",)
    autocomplete_fields = ("paciente", "cirurgiao", "procedimentos")

    def procedimentos_lista(self, obj):
        nomes = list(obj.procedimentos.values_list("nome", flat=True)[:3])
        if not nomes and (obj.procedimento or "").strip():
            return obj.procedimento
        if len(nomes) == 3 and obj.procedimentos.count() > 3:
            return ", ".join(nomes) + "..."
        return ", ".join(nomes) if nomes else "-"

    procedimentos_lista.short_description = "Procedimentos"


@admin.register(ProcedimentoCirurgico)
class ProcedimentoCirurgicoAdmin(CoreAdmin):
    list_display = ("nome", "ativo", "criado_em")
    list_filter = ("ativo", "deletado")
    search_fields = ("nome", "descricao", "id_custom")
    ordering = ("nome",)
