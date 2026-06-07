from django.contrib import admin

from .models.absence import Absence
from .models.attendance import PresenceRecord
from .models.contract import Contract
from .models.disciplinary_process import DisciplinaryProcess
from .models.employee import Employee
from .models.employee_document import EmployeeDocument
from .models.family_dependent import FamilyDependent
from .models.job_title import JobTitle
from .models.leave_permission import LeavePermission
from .models.overtime import Overtime
from .models.payroll import Payroll
from .models.payroll_run import PayrollItem, PayrollRun
from .models.profession import Profession
from .models.salary_history import SalaryHistory
from .models.termination import Termination
from .models.vacation import Vacation
from .models.vacation_balance import VacationBalance
from .models.work_schedule import WorkSchedule


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("custom_id", "created_at", "updated_at", "created_by", "updated_by", "version")
    ordering = ("-created_at",)


# ── Inlines ──────────────────────────────────────────────────────────────────

class FamilyDependentInline(admin.TabularInline):
    model = FamilyDependent
    extra = 0
    fields = ("name", "relationship", "gender", "birth_date", "phone", "is_emergency_contact", "is_dependent", "benefit_eligible")
    verbose_name = "Agregado familiar"
    verbose_name_plural = "Agregados familiares"


class WorkScheduleInline(admin.TabularInline):
    model = WorkSchedule
    extra = 0
    fields = ("weekday", "start_time", "end_time", "schedule_type", "shift_name", "active")
    verbose_name = "Horário"
    verbose_name_plural = "Horários de trabalho"


class ContractInline(admin.TabularInline):
    model = Contract
    extra = 0
    fields = ("contract_type", "start_date", "end_date", "salary", "status")
    verbose_name = "Contrato"
    verbose_name_plural = "Contratos"


class SalaryHistoryInline(admin.TabularInline):
    model = SalaryHistory
    extra = 0
    fields = ("amount", "effective_from", "effective_until", "is_current", "reason")
    verbose_name = "Registo salarial"
    verbose_name_plural = "Histórico salarial"


class PayrollItemInline(admin.TabularInline):
    model = PayrollItem
    extra = 0
    fields = ("employee", "base_salary", "overtime_amount", "allowances", "absence_deductions", "other_deductions", "gross_pay", "net_pay", "status")
    readonly_fields = ("gross_pay", "net_pay")
    verbose_name = "Item"
    verbose_name_plural = "Itens da folha"


# ── Cargos e Profissões ───────────────────────────────────────────────────────

@admin.register(JobTitle)
class JobTitleAdmin(CoreAdmin):
    list_display = ("custom_id", "name", "hierarchy_level", "reports_to", "salary_grade", "status", "is_doctor")
    list_filter = ("is_doctor", "status")
    search_fields = ("name", "custom_id")
    ordering = ("hierarchy_level", "name")


@admin.register(Profession)
class ProfessionAdmin(CoreAdmin):
    list_display = ("custom_id", "name", "professional_category", "base_salary", "ordinary_hour_value", "requires_license", "active")
    list_filter = ("active", "professional_category", "requires_license")
    search_fields = ("name", "custom_id", "professional_category")
    ordering = ("name",)


# ── Funcionários ──────────────────────────────────────────────────────────────

@admin.register(Employee)
class EmployeeAdmin(CoreAdmin):
    list_display = ("custom_id", "name", "role", "profession", "status", "admission_date", "salario_base_display", "salario_liquido_display")
    list_filter = ("status", "role", "profession", "gender", "payment_method")
    search_fields = ("name", "custom_id", "email", "phone", "nuit", "inss_number", "document_number")
    ordering = ("name",)
    inlines = [FamilyDependentInline, WorkScheduleInline, ContractInline, SalaryHistoryInline]
    fieldsets = (
        ("Dados pessoais", {
            "fields": ("name", "gender", "date_of_birth", "nationality", "marital_status", "address"),
        }),
        ("Documentos", {
            "fields": ("document_type", "document_number", "nuit", "inss_number"),
        }),
        ("Contacto", {
            "fields": ("email", "phone", "emergency_contact_name", "emergency_contact_phone"),
        }),
        ("Dados laborais", {
            "fields": ("role", "profession", "admission_date", "status"),
        }),
        ("Pagamento", {
            "fields": ("nib", "payment_method", "nominal_salary", "salary_increase", "base_month_hours"),
        }),
        ("Horas e progressão", {
            "fields": ("ordinary_hour_value", "extraordinary_hour_value", "minimum_progression_months", "minimum_career_change_months", "family_allowance_per_dependent"),
            "classes": ("collapse",),
        }),
        ("Auditoria", {
            "fields": ("custom_id", "created_at", "updated_at", "created_by", "updated_by"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Salário base")
    def salario_base_display(self, obj):
        return obj.salary_base

    @admin.display(description="Salário líquido")
    def salario_liquido_display(self, obj):
        return obj.salary_liquido


@admin.register(FamilyDependent)
class FamilyDependentAdmin(CoreAdmin):
    list_display = ("custom_id", "name", "employee", "relationship", "is_dependent", "is_emergency_contact", "lives_with_employee")
    list_filter = ("relationship", "is_dependent", "is_emergency_contact", "lives_with_employee")
    search_fields = ("name", "custom_id", "employee__name")
    ordering = ("name",)
    autocomplete_fields = ("employee",)


# ── Horários e Assiduidade ────────────────────────────────────────────────────

@admin.register(WorkSchedule)
class WorkScheduleAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "schedule_type", "shift_name", "weekday", "start_time", "end_time", "effective_from", "effective_until", "active")
    list_filter = ("weekday", "active", "schedule_type")
    search_fields = ("employee__name", "shift_name")
    ordering = ("employee", "weekday", "start_time")
    autocomplete_fields = ("employee",)


@admin.register(PresenceRecord)
class PresenceRecordAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "date", "status", "clock_in", "clock_out", "worked_hours", "late_minutes")
    list_filter = ("status", "date")
    search_fields = ("employee__name", "custom_id")
    ordering = ("-date", "employee")
    autocomplete_fields = ("employee",)
    date_hierarchy = "date"


# ── Faltas, Férias e Dispensas ────────────────────────────────────────────────

@admin.register(Absence)
class AbsenceAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "date", "absence_type", "status", "justified", "deduct_from_salary")
    list_filter = ("absence_type", "status", "justified", "deduct_from_salary")
    search_fields = ("employee__name", "custom_id", "reason")
    ordering = ("-date", "-created_at")
    autocomplete_fields = ("employee",)
    date_hierarchy = "date"


@admin.register(Vacation)
class VacationAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "vacation_year", "start_date", "end_date", "total_days", "status", "approved_by")
    list_filter = ("status", "vacation_year")
    search_fields = ("employee__name", "custom_id")
    ordering = ("-start_date", "-created_at")
    autocomplete_fields = ("employee",)


@admin.register(VacationBalance)
class VacationBalanceAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "year", "entitled_days", "used_days", "pending_days", "remaining_days", "carried_over_days")
    list_filter = ("year",)
    search_fields = ("employee__name", "custom_id")
    ordering = ("-year", "employee")
    readonly_fields = (*CoreAdmin.readonly_fields, "remaining_days")
    autocomplete_fields = ("employee",)


@admin.register(LeavePermission)
class LeavePermissionAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "permission_date", "start_time", "end_time", "status", "paid_permission", "approved_by")
    list_filter = ("status", "paid_permission")
    search_fields = ("employee__name", "custom_id", "reason")
    ordering = ("-permission_date", "-created_at")
    autocomplete_fields = ("employee",)


# ── Horas Extras ──────────────────────────────────────────────────────────────

@admin.register(Overtime)
class OvertimeAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "date", "kind", "overtime_type", "hours", "multiplier", "status", "approved_by")
    list_filter = ("kind", "overtime_type", "status")
    search_fields = ("employee__name", "custom_id")
    ordering = ("-date", "-created_at")
    autocomplete_fields = ("employee",)
    date_hierarchy = "date"


# ── Contratos e Documentos ────────────────────────────────────────────────────

@admin.register(Contract)
class ContractAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "contract_type", "start_date", "end_date", "salary", "status")
    list_filter = ("contract_type", "status")
    search_fields = ("employee__name", "custom_id")
    ordering = ("-start_date", "-created_at")
    autocomplete_fields = ("employee",)


@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "document_type", "title", "status")
    list_filter = ("document_type", "status")
    search_fields = ("employee__name", "title", "custom_id")
    ordering = ("employee", "document_type")
    autocomplete_fields = ("employee",)


@admin.register(SalaryHistory)
class SalaryHistoryAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "amount", "effective_from", "effective_until", "is_current", "reason")
    list_filter = ("is_current",)
    search_fields = ("employee__name", "custom_id")
    ordering = ("-effective_from", "employee")
    autocomplete_fields = ("employee",)


# ── Processos Disciplinares e Desligamentos ───────────────────────────────────

@admin.register(DisciplinaryProcess)
class DisciplinaryProcessAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "incident_date", "incident_type", "severity", "sanction", "status", "resolved_at")
    list_filter = ("severity", "status", "sanction")
    search_fields = ("employee__name", "custom_id", "incident_type", "reported_by")
    ordering = ("-incident_date", "-created_at")
    autocomplete_fields = ("employee",)


@admin.register(Termination)
class TerminationAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "date", "type", "reason")
    list_filter = ("type",)
    search_fields = ("employee__name", "custom_id")
    ordering = ("-date", "-created_at")
    autocomplete_fields = ("employee",)


# ── Folhas de Pagamento ───────────────────────────────────────────────────────

@admin.register(Payroll)
class PayrollAdmin(CoreAdmin):
    list_display = ("custom_id", "employee", "year", "month", "salario_base_display", "salario_liquido_display", "absence_days", "absence_discount_value", "family_allowance_value", "closed")
    list_filter = ("year", "month", "closed")
    search_fields = ("employee__name", "custom_id")
    ordering = ("-year", "-month", "-created_at")

    @admin.display(description="Salário base")
    def salario_base_display(self, obj):
        return obj.salary_base

    @admin.display(description="Salário líquido")
    def salario_liquido_display(self, obj):
        return obj.salary_liquido


@admin.register(PayrollRun)
class PayrollRunAdmin(CoreAdmin):
    list_display = ("custom_id", "payroll_period", "start_date", "end_date", "status", "total_gross", "total_deductions", "total_net", "approved_by")
    list_filter = ("status",)
    search_fields = ("payroll_period", "custom_id")
    ordering = ("-payroll_period", "-created_at")
    inlines = [PayrollItemInline]


@admin.register(PayrollItem)
class PayrollItemAdmin(CoreAdmin):
    list_display = ("custom_id", "payroll_run", "employee", "base_salary", "overtime_amount", "gross_pay", "net_pay", "status")
    list_filter = ("status",)
    search_fields = ("employee__name", "custom_id", "payroll_run__payroll_period")
    ordering = ("payroll_run", "employee")
    readonly_fields = (*CoreAdmin.readonly_fields, "gross_pay", "net_pay")
    autocomplete_fields = ("employee",)


# Alias legado
AgregadoFamiliarInline = FamilyDependentInline
