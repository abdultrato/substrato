from django.contrib import admin

from .modelos.prescricao_item import PrescricaoItem
from .modelos.registro_prontuario import RegistroProntuario


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


class PrescricaoItemInline(admin.TabularInline):
    model = PrescricaoItem
    extra = 0
    autocomplete_fields = ("medicacao",)
    fields = (
        "medicacao",
        "dosagem_valor",
        "dosagem_unidade",
        "intervalo_horas",
        "numero_doses",
        "observacoes",
    )


@admin.register(RegistroProntuario)
class RegistroProntuarioAdmin(CoreAdmin):
    list_display = (
        "inicio_atendimento",
        "fim_atendimento",
        "paciente",
        "medico",
        "estado",
    )
    list_filter = ("estado",)
    search_fields = ("paciente__nome", "medico__nome", "diagnostico")
    ordering = ("-inicio_atendimento", "-criado_em")

    filter_horizontal = ("consultas",)
    inlines = [PrescricaoItemInline]


@admin.register(PrescricaoItem)
class PrescricaoItemAdmin(CoreAdmin):
    list_display = (
        "registro",
        "medicacao",
        "dosagem_valor",
        "dosagem_unidade",
        "intervalo_horas",
        "numero_doses",
        "criado_em",
    )
    list_filter = ("dosagem_unidade", "deletado")
    search_fields = (
        "registro__id_custom",
        "registro__paciente__nome",
        "medicacao__nome",
    )
    autocomplete_fields = ("registro", "medicacao")
