from rest_framework.permissions import IsAuthenticated  # Restringe acesso
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
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

from ..filters import (
    AbsenceFilter,
    DisciplinaryProcessFilter,
    EmployeeFilter,
    FamilyDependentFilter,
    JobTitleFilter,
    OvertimeFilter,
    PayrollFilter,
    ProfessionFilter,
    TerminationFilter,
    VacationFilter,
    WorkScheduleFilter,
)
from ..serializers import (
    AbsenceSerializer,
    DisciplinaryProcessSerializer,
    EmployeeSerializer,
    FamilyDependentSerializer,
    JobTitleSerializer,
    OvertimeSerializer,
    PayrollSerializer,
    ProfessionSerializer,
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


class ProfessionViewSet(TenantScopedModelViewSet):
    queryset = Profession.objects.all()
    serializer_class = ProfessionSerializer
    filterset_class = ProfessionFilter
    search_fields = ["custom_id", "name"]
    ordering_fields = ["name", "active", "created_at"]
    ordering = ["name"]


class EmployeeViewSet(TenantScopedModelViewSet):
    queryset = Employee.objects.select_related("role", "profession").all()
    serializer_class = EmployeeSerializer
    filterset_class = EmployeeFilter
    search_fields = ["custom_id", "name", "profession__name", "email", "phone"]
    ordering_fields = ["name", "profession__name", "admission_date", "status", "created_at"]
    ordering = ["name"]

    def _set_employee_status(self, employee: Employee, status_value: str):
        if employee.status != status_value:
            employee.status = status_value
            employee.save(update_fields=["status"])
        return Response(self.get_serializer(employee).data)

    def destroy(self, request, *args, **kwargs):
        """
        Não remove funcionário: converte DELETE em inativação.
        """
        employee = self.get_object()
        return self._set_employee_status(employee, Employee.Status.INACTIVE)

    @action(detail=True, methods=["post"], url_path="desativar", url_name="desativar")
    def deactivate(self, request, pk=None):
        employee = self.get_object()
        return self._set_employee_status(employee, Employee.Status.INACTIVE)

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def activate(self, request, pk=None):
        employee = self.get_object()
        return self._set_employee_status(employee, Employee.Status.ACTIVE)

    @action(detail=True, methods=["post"], url_path="deactivate", url_name="deactivate")
    def deactivate_en(self, request, pk=None):
        return self.deactivate(request, pk=pk)

    @action(detail=True, methods=["post"], url_path="activate", url_name="activate")
    def activate_en(self, request, pk=None):
        return self.activate(request, pk=pk)


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
    ordering_fields = ["date", "kind", "created_at"]
    ordering = ["-date", "-created_at"]


class DisciplinaryProcessViewSet(TenantScopedModelViewSet):
    queryset = DisciplinaryProcess.objects.select_related("employee").all()
    serializer_class = DisciplinaryProcessSerializer
    filterset_class = DisciplinaryProcessFilter
    ordering_fields = ["incident_date", "severity", "status", "created_at"]
    ordering = ["-incident_date", "-created_at"]


class PayrollViewSet(TenantScopedModelViewSet):
    queryset = Payroll.objects.select_related("employee").all()
    serializer_class = PayrollSerializer
    filterset_class = PayrollFilter
    ordering_fields = ["year", "month", "created_at", "closed"]
    ordering = ["-year", "-month", "-created_at"]


VIEWSET_MAP = {
    "role": JobTitleViewSet,
    "profissao": ProfessionViewSet,
    "employee": EmployeeViewSet,
    "processodisciplinar": DisciplinaryProcessViewSet,
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
    "DisciplinaryProcessViewSet",
    "EmployeeViewSet",
    "FamilyDependentViewSet",
    "JobTitleViewSet",
    "OvertimeViewSet",
    "PayrollViewSet",
    "ProfessionViewSet",
    "TerminationViewSet",
    "VacationViewSet",
    "WorkScheduleViewSet",
]

