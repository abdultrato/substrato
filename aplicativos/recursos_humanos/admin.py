from django.contrib import admin

from .modelos.agregado_familiar import AgregadoFamiliar
from .modelos.cargo import Cargo
from .modelos.dispensa import Dispensa
from .modelos.falta import Falta
from .modelos.ferias import Ferias
from .modelos.folha_pagamento import FolhaPagamento
from .modelos.funcionario import Funcionario
from .modelos.hora_extra import HoraExtra
from .modelos.horario_trabalho import HorarioTrabalho


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


class AgregadoFamiliarInline(admin.TabularInline):
    model = AgregadoFamiliar
    extra = 0
    fields = (
        "nome",
        "parentesco",
        "data_nascimento",
        "telefone",
        "vive_com_funcionario",
        "observacoes",
    )


@admin.register(Cargo)
class CargoAdmin(CoreAdmin):
    list_display = ("nome", "eh_medico", "inquilino", "criado_em")
    list_filter = ("eh_medico",)
    search_fields = ("nome",)
    ordering = ("nome",)


@admin.register(Funcionario)
class FuncionarioAdmin(CoreAdmin):
    list_display = ("nome", "cargo", "estado", "salario_nominal", "inquilino")
    list_filter = ("estado", "cargo")
    search_fields = ("nome", "email", "telefone")
    ordering = ("nome",)
    inlines = [AgregadoFamiliarInline]


@admin.register(AgregadoFamiliar)
class AgregadoFamiliarAdmin(CoreAdmin):
    list_display = ("nome", "funcionario", "parentesco", "vive_com_funcionario", "inquilino", "criado_em")
    list_filter = ("parentesco", "vive_com_funcionario")
    search_fields = ("nome", "funcionario__nome")
    ordering = ("nome",)
    autocomplete_fields = ("funcionario",)


@admin.register(HorarioTrabalho)
class HorarioTrabalhoAdmin(CoreAdmin):
    list_display = ("funcionario", "dia_semana", "hora_inicio", "hora_fim", "ativo")
    list_filter = ("dia_semana", "ativo")
    ordering = ("funcionario", "dia_semana", "hora_inicio")


@admin.register(Falta)
class FaltaAdmin(CoreAdmin):
    list_display = ("data", "funcionario", "justificada", "motivo")
    list_filter = ("justificada",)
    ordering = ("-data", "-criado_em")


@admin.register(Ferias)
class FeriasAdmin(CoreAdmin):
    list_display = ("data_inicio", "data_fim", "funcionario", "estado")
    list_filter = ("estado",)
    ordering = ("-data_inicio", "-criado_em")


@admin.register(Dispensa)
class DispensaAdmin(CoreAdmin):
    list_display = ("data", "funcionario", "tipo")
    list_filter = ("tipo",)
    ordering = ("-data", "-criado_em")


@admin.register(HoraExtra)
class HoraExtraAdmin(CoreAdmin):
    list_display = ("data", "funcionario", "horas", "multiplicador")
    ordering = ("-data", "-criado_em")


@admin.register(FolhaPagamento)
class FolhaPagamentoAdmin(CoreAdmin):
    list_display = ("ano", "mes", "funcionario", "salario_nominal", "horas_extras_apuradas", "salario_total", "fechado")
    list_filter = ("ano", "mes", "fechado")
    ordering = ("-ano", "-mes", "-criado_em")
