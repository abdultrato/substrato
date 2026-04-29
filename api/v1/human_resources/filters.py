from api.core.filters import SafeFilterSet  # Base com saneamento
from apps.human_resources.models.absence import Absence
from apps.human_resources.models.disciplinary_process import DisciplinaryProcess
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.profession import Profession
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.vacation import Vacation
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
}

