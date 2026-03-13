from django.contrib import admin

from .modelos.consulta_medica import ConsultaMedica


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


@admin.register(ConsultaMedica)
class ConsultaMedicaAdmin(CoreAdmin):
    list_display = (
        "agendada_para",
        "paciente",
        "medico",
        "tipo",
        "estado",
        "preco",
    )
    list_filter = ("estado", "tipo")
    search_fields = ("tipo", "paciente__nome", "medico__username")
    ordering = ("-agendada_para", "-criado_em")
