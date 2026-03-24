from django.contrib import admin

from .models.surgery import Surgery
from .models.surgical_procedure import SurgicalProcedure


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


@admin.register(Surgery)
class CirurgiaAdmin(CoreAdmin):
    list_display = (
        "agendada_para",
        "paciente",
        "cirurgiao",
        "procedimentos_lista",
        "preco_estimado",
        "iva_percentual",
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


@admin.register(SurgicalProcedure)
class ProcedimentoCirurgicoAdmin(CoreAdmin):
    list_display = ("nome", "preco_base", "iva_percentual", "aplica_iva_por_padrao", "ativo", "criado_em")
    list_filter = ("ativo", "deletado")
    search_fields = ("nome", "descricao", "id_custom")
    ordering = ("nome",)
