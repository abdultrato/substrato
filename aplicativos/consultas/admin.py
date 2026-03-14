from django.contrib import admin

from .modelos.consulta_medica import ConsultaMedica
from .modelos.especialidade_consulta import EspecialidadeConsulta
from .modelos.feriado import Feriado


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
        "especialidade",
        "tipo",
        "estado",
        "preco",
    )
    list_filter = ("estado", "tipo")
    search_fields = ("tipo", "paciente__nome", "medico__username")
    ordering = ("-agendada_para", "-criado_em")


@admin.register(EspecialidadeConsulta)
class EspecialidadeConsultaAdmin(CoreAdmin):
    list_display = ("nome", "preco_base", "iva_percentual", "ativo", "inquilino", "criado_em")
    list_filter = ("ativo",)
    search_fields = ("nome",)
    ordering = ("nome",)


@admin.register(Feriado)
class FeriadoAdmin(CoreAdmin):
    list_display = ("data", "descricao", "ativo", "inquilino", "criado_em")
    list_filter = ("ativo", "data")
    search_fields = ("descricao",)
    ordering = ("-data", "-criado_em")
