from api.core.filters import SafeFilterSet  # Base com saneamento
from apps.human_resources.models.absence import Absence
from apps.human_resources.models.attendance import PresenceRecord as AttendanceRecord
from apps.human_resources.models.contract import Contract
from apps.human_resources.models.disciplinary_process import DisciplinaryProcess
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.employee_document import EmployeeDocument
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.leave_permission import LeavePermission
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.payroll_run import PayrollItem, PayrollRun
from apps.human_resources.models.profession import Profession
from apps.human_resources.models.salary_history import SalaryHistory
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.vacation_balance import VacationBalance
from apps.human_resources.models.work_schedule import WorkSchedule


class JobTitleFilter(SafeFilterSet):
    class Meta:
        model = JobTitle  # Dataset filtrado
        fields = ["name", "created_at"]  # Campos permitidos


class ProfessionFilter(SafeFilterSet):
    class Meta:
        model = Profession
        fields = ["name", "active", "created_at"]


class EmployeeFilter(SafeFilterSet):
    class Meta:
        model = Employee
        fields = ["role", "profession", "status", "admission_date", "created_at"]


class DisciplinaryProcessFilter(SafeFilterSet):
    class Meta:
        model = DisciplinaryProcess
        fields = ["employee", "incident_date", "severity", "status", "created_at"]


class FamilyDependentFilter(SafeFilterSet):
    class Meta:
        model = FamilyDependent
        fields = ["employee", "relationship", "lives_with_employee", "created_at"]


class WorkScheduleFilter(SafeFilterSet):
    class Meta:
        model = WorkSchedule
        fields = ["employee", "weekday", "active"]


class AbsenceFilter(SafeFilterSet):
    class Meta:
        model = Absence
        fields = ["employee", "date", "justified"]


class VacationFilter(SafeFilterSet):
    class Meta:
        model = Vacation
        fields = ["employee", "status", "start_date"]


class TerminationFilter(SafeFilterSet):
    class Meta:
        model = Termination
        fields = ["employee", "type", "date"]


class OvertimeFilter(SafeFilterSet):
    class Meta:
        model = Overtime
        fields = ["employee", "date", "kind"]


class PayrollFilter(SafeFilterSet):
    class Meta:
        model = Payroll
        fields = ["employee", "year", "month", "closed"]


class AttendanceRecordFilter(SafeFilterSet):
    class Meta:
        model = AttendanceRecord
        fields = ["employee", "date", "status"]


class LeavePermissionFilter(SafeFilterSet):
    class Meta:
        model = LeavePermission
        fields = ["employee", "permission_date", "status", "paid_permission"]


class VacationBalanceFilter(SafeFilterSet):
    class Meta:
        model = VacationBalance
        fields = ["employee", "year"]


class ContractFilter(SafeFilterSet):
    class Meta:
        model = Contract
        fields = ["employee", "contract_type", "status", "start_date"]


class EmployeeDocumentFilter(SafeFilterSet):
    class Meta:
        model = EmployeeDocument
        fields = ["employee", "document_type", "status"]


class SalaryHistoryFilter(SafeFilterSet):
    class Meta:
        model = SalaryHistory
        fields = ["employee", "is_current", "effective_from"]


class PayrollRunFilter(SafeFilterSet):
    class Meta:
        model = PayrollRun
        fields = ["payroll_period", "status"]


class PayrollItemFilter(SafeFilterSet):
    class Meta:
        model = PayrollItem
        fields = ["payroll_run", "employee", "status"]


FILTER_MAP = {
    "role": JobTitleFilter,
    "profissao": ProfessionFilter,
    "employee": EmployeeFilter,
    "processodisciplinar": DisciplinaryProcessFilter,
    "agregadofamiliar": FamilyDependentFilter,
    "horario": WorkScheduleFilter,
    "falta": AbsenceFilter,
    "ferias": VacationFilter,
    "dispensa": TerminationFilter,
    "horaextra": OvertimeFilter,
    "folhapagamento": PayrollFilter,
    "assiduidade": AttendanceRecordFilter,
    "licenca": LeavePermissionFilter,
    "saldo_ferias": VacationBalanceFilter,
    "contrato": ContractFilter,
    "documento_funcionario": EmployeeDocumentFilter,
    "historico_salarial": SalaryHistoryFilter,
    "folha_run": PayrollRunFilter,
    "folha_item": PayrollItemFilter,
}

