from django.contrib import admin

from .models.absence import Absence
from .models.disciplinary_process import DisciplinaryProcess
from .models.employee import Employee
from .models.family_dependent import FamilyDependent
from .models.job_title import JobTitle
from .models.overtime import Overtime
from .models.payroll import Payroll
from .models.profession import Profession
from .models.termination import Termination
from .models.vacation import Vacation
from .models.work_schedule import WorkSchedule


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)  # Reaproveita soft delete
    search_fields = ("custom_id",)  # Busca rápida pelo ID amigável
    readonly_fields = ("created_at", "updated_at")  # Campos de auditoria
    ordering = ("-created_at",)  # Ordem padrão decrescente


class FamilyDependentInline(admin.TabularInline):
    model = FamilyDependent
    extra = 0
    fields = (
        "name",
        "relationship",
        "birth_date",
        "phone",
        "lives_with_employee",
        "notes",
    )


@admin.register(JobTitle)
class JobTitleAdmin(CoreAdmin):
    list_display = ("name", "is_doctor", "tenant", "created_at")  # Colunas visíveis
    list_filter = ("is_doctor",)  # Filtra médicos
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(Profession)
class ProfessionAdmin(CoreAdmin):
    list_display = ("name", "base_salary", "ordinary_hour_value", "extraordinary_hour_value", "active", "tenant")
    list_filter = ("active",)
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(Employee)
class EmployeeAdmin(CoreAdmin):
    list_display = ("name", "role", "profession", "status", "salary_base_admin", "salary_liquido_admin", "tenant")
    list_filter = ("status", "role", "profession")
    search_fields = ("name", "profession__name", "email", "phone")
    ordering = ("name",)
    inlines = [FamilyDependentInline]  # Mostra dependentes na mesma tela

    @admin.display(description="Salário base")
    def salary_base_admin(self, obj: Employee):
        return obj.salary_base

    @admin.display(description="Salário líquido")
    def salary_liquido_admin(self, obj: Employee):
        return obj.salary_liquido


@admin.register(FamilyDependent)
class FamilyDependentAdmin(CoreAdmin):
    list_display = ("name", "employee", "relationship", "lives_with_employee", "tenant", "created_at")
    list_filter = ("relationship", "lives_with_employee")
    search_fields = ("name", "employee__name")
    ordering = ("name",)
    autocomplete_fields = ("employee",)  # Evita dropdowns grandes


@admin.register(WorkSchedule)
class WorkScheduleAdmin(CoreAdmin):
    list_display = ("employee", "weekday", "start_time", "end_time", "active")
    list_filter = ("weekday", "active")
    ordering = ("employee", "weekday", "start_time")


@admin.register(Absence)
class AbsenceAdmin(CoreAdmin):
    list_display = ("date", "employee", "justified", "reason")
    list_filter = ("justified",)
    ordering = ("-date", "-created_at")


@admin.register(Vacation)
class VacationAdmin(CoreAdmin):
    list_display = ("start_date", "end_date", "employee", "status")
    list_filter = ("status",)
    ordering = ("-start_date", "-created_at")


@admin.register(Termination)
class TerminationAdmin(CoreAdmin):
    list_display = ("date", "employee", "type")
    list_filter = ("type",)
    ordering = ("-date", "-created_at")


@admin.register(Overtime)
class OvertimeAdmin(CoreAdmin):
    list_display = ("date", "employee", "kind", "hours", "multiplier")
    ordering = ("-date", "-created_at")


@admin.register(Payroll)
class PayrollAdmin(CoreAdmin):
    list_display = (
        "year",
        "month",
        "employee",
        "salary_base_admin",
        "salary_liquido_admin",
        "salary_increase_value",
        "tenure_increase_value",
        "absence_days",
        "absence_discount_value",
        "family_allowance_value",
        "closed",
    )
    list_filter = ("year", "month", "closed")
    ordering = ("-year", "-month", "-created_at")

    @admin.display(description="Salário base")
    def salary_base_admin(self, obj: Payroll):
        return obj.salary_base

    @admin.display(description="Salário líquido")
    def salary_liquido_admin(self, obj: Payroll):
        return obj.salary_liquido


@admin.register(DisciplinaryProcess)
class DisciplinaryProcessAdmin(CoreAdmin):
    list_display = ("incident_date", "employee", "severity", "status", "resolved_at")
    list_filter = ("severity", "status")
    ordering = ("-incident_date", "-created_at")


AgregadoFamiliarInline = FamilyDependentInline  # Alias legado
