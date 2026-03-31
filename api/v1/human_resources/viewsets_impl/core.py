from rest_framework.permissions import IsAuthenticated  # Restringe acesso
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.human_resources.models.absence import Absence
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.work_schedule import WorkSchedule

from ..filters import (
    AbsenceFilter,
    EmployeeFilter,
    FamilyDependentFilter,
    JobTitleFilter,
    OvertimeFilter,
    PayrollFilter,
    TerminationFilter,
    VacationFilter,
    WorkScheduleFilter,
)
from ..serializers import (
    AbsenceSerializer,
    EmployeeSerializer,
    FamilyDependentSerializer,
    JobTitleSerializer,
    OvertimeSerializer,
    PayrollSerializer,
    TerminationSerializer,
    VacationSerializer,
    WorkScheduleSerializer,
)


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]  # Autenticado + escopo tenant


class JobTitleViewSet(TenantScopedModelViewSet):
    queryset = JobTitle.objects.all()
    serializer_class = JobTitleSerializer
    filterset_class = JobTitleFilter
    search_fields = ["custom_id", "name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]


class EmployeeViewSet(TenantScopedModelViewSet):
    queryset = Employee.objects.select_related("role").all()
    serializer_class = EmployeeSerializer
    filterset_class = EmployeeFilter
    search_fields = ["custom_id", "name", "profession", "email", "phone"]
    ordering_fields = ["name", "profession", "admission_date", "status", "created_at"]
    ordering = ["name"]


class FamilyDependentViewSet(TenantScopedModelViewSet):
    queryset = FamilyDependent.objects.select_related("employee").all()
    serializer_class = FamilyDependentSerializer
    filterset_class = FamilyDependentFilter
    search_fields = ["custom_id", "name", "employee__name"]
    ordering_fields = ["name", "relationship", "created_at"]
    ordering = ["name"]


class WorkScheduleViewSet(TenantScopedModelViewSet):
    queryset = WorkSchedule.objects.select_related("employee").all()
    serializer_class = WorkScheduleSerializer
    filterset_class = WorkScheduleFilter
    ordering_fields = ["employee", "weekday", "start_time"]
    ordering = ["employee", "weekday", "start_time"]


class AbsenceViewSet(TenantScopedModelViewSet):
    queryset = Absence.objects.select_related("employee").all()
    serializer_class = AbsenceSerializer
    filterset_class = AbsenceFilter
    ordering_fields = ["date", "created_at"]
    ordering = ["-date", "-created_at"]


class VacationViewSet(TenantScopedModelViewSet):
    queryset = Vacation.objects.select_related("employee").all()
    serializer_class = VacationSerializer
    filterset_class = VacationFilter
    ordering_fields = ["start_date", "status", "created_at"]
    ordering = ["-start_date", "-created_at"]


class TerminationViewSet(TenantScopedModelViewSet):
    queryset = Termination.objects.select_related("employee").all()
    serializer_class = TerminationSerializer
    filterset_class = TerminationFilter
    ordering_fields = ["date", "type", "created_at"]
    ordering = ["-date", "-created_at"]


class OvertimeViewSet(TenantScopedModelViewSet):
    queryset = Overtime.objects.select_related("employee").all()
    serializer_class = OvertimeSerializer
    filterset_class = OvertimeFilter
    ordering_fields = ["date", "created_at"]
    ordering = ["-date", "-created_at"]


class PayrollViewSet(TenantScopedModelViewSet):
    queryset = Payroll.objects.select_related("employee").all()
    serializer_class = PayrollSerializer
    filterset_class = PayrollFilter
    ordering_fields = ["year", "month", "created_at", "closed"]
    ordering = ["-year", "-month", "-created_at"]


VIEWSET_MAP = {
    "role": JobTitleViewSet,
    "employee": EmployeeViewSet,
    "agregadofamiliar": FamilyDependentViewSet,
    "horario": WorkScheduleViewSet,
    "falta": AbsenceViewSet,
    "ferias": VacationViewSet,
    "dispensa": TerminationViewSet,
    "horaextra": OvertimeViewSet,
    "folhapagamento": PayrollViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AbsenceViewSet",
    "EmployeeViewSet",
    "FamilyDependentViewSet",
    "JobTitleViewSet",
    "OvertimeViewSet",
    "PayrollViewSet",
    "TerminationViewSet",
    "VacationViewSet",
    "WorkScheduleViewSet",
]

