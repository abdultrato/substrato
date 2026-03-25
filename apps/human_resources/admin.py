from django.contrib import admin

from .models.absence import Absence
from .models.employee import Employee
from .models.family_dependent import FamilyDependent
from .models.job_title import JobTitle
from .models.overtime import Overtime
from .models.payroll import Payroll
from .models.termination import Termination
from .models.vacation import Vacation
from .models.work_schedule import WorkSchedule


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


class FamilyDependentInline(admin.TabularInline):
    model = FamilyDependent
    extra = 0
    fields = (
        "nome",
        "parentesco",
        "data_nascimento",
        "telefone",
        "vive_com_funcionario",
        "observacoes",
    )


@admin.register(JobTitle)
class JobTitleAdmin(CoreAdmin):
    list_display = ("nome", "eh_medico", "inquilino", "criado_em")
    list_filter = ("eh_medico",)
    search_fields = ("nome",)
    ordering = ("nome",)


@admin.register(Employee)
class EmployeeAdmin(CoreAdmin):
    list_display = ("nome", "cargo", "profissao", "estado", "salario_nominal", "inquilino")
    list_filter = ("estado", "cargo")
    search_fields = ("nome", "profissao", "email", "telefone")
    ordering = ("nome",)
    inlines = [FamilyDependentInline]


@admin.register(FamilyDependent)
class FamilyDependentAdmin(CoreAdmin):
    list_display = ("nome", "funcionario", "parentesco", "vive_com_funcionario", "inquilino", "criado_em")
    list_filter = ("parentesco", "vive_com_funcionario")
    search_fields = ("nome", "funcionario__nome")
    ordering = ("nome",)
    autocomplete_fields = ("funcionario",)


@admin.register(WorkSchedule)
class WorkScheduleAdmin(CoreAdmin):
    list_display = ("funcionario", "dia_semana", "hora_inicio", "hora_fim", "ativo")
    list_filter = ("dia_semana", "ativo")
    ordering = ("funcionario", "dia_semana", "hora_inicio")


@admin.register(Absence)
class AbsenceAdmin(CoreAdmin):
    list_display = ("data", "funcionario", "justificada", "motivo")
    list_filter = ("justificada",)
    ordering = ("-data", "-criado_em")


@admin.register(Vacation)
class VacationAdmin(CoreAdmin):
    list_display = ("data_inicio", "data_fim", "funcionario", "estado")
    list_filter = ("estado",)
    ordering = ("-data_inicio", "-criado_em")


@admin.register(Termination)
class TerminationAdmin(CoreAdmin):
    list_display = ("data", "funcionario", "tipo")
    list_filter = ("tipo",)
    ordering = ("-data", "-criado_em")


@admin.register(Overtime)
class OvertimeAdmin(CoreAdmin):
    list_display = ("data", "funcionario", "horas", "multiplicador")
    ordering = ("-data", "-criado_em")


@admin.register(Payroll)
class PayrollAdmin(CoreAdmin):
    list_display = ("ano", "mes", "funcionario", "salario_nominal", "horas_extras_apuradas", "salario_total", "fechado")
    list_filter = ("ano", "mes", "fechado")
    ordering = ("-ano", "-mes", "-criado_em")


AgregadoFamiliarInline = FamilyDependentInline
CargoAdmin = JobTitleAdmin
FuncionarioAdmin = EmployeeAdmin
AgregadoFamiliarAdmin = FamilyDependentAdmin
HorarioTrabalhoAdmin = WorkScheduleAdmin
FaltaAdmin = AbsenceAdmin
FeriasAdmin = VacationAdmin
DispensaAdmin = TerminationAdmin
HoraExtraAdmin = OvertimeAdmin
FolhaPagamentoAdmin = PayrollAdmin
