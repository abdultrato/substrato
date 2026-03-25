from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

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
    permission_classes = [IsAuthenticated]


class JobTitleViewSet(TenantScopedModelViewSet):
    queryset = JobTitle.objects.all()
    serializer_class = JobTitleSerializer
    filterset_class = JobTitleFilter
    search_fields = ["id_custom", "nome"]
    ordering_fields = ["nome", "criado_em"]
    ordering = ["nome"]


class EmployeeViewSet(TenantScopedModelViewSet):
    queryset = Employee.objects.select_related("cargo").all()
    serializer_class = EmployeeSerializer
    filterset_class = EmployeeFilter
    search_fields = ["id_custom", "nome", "profissao", "email", "telefone"]
    ordering_fields = ["nome", "profissao", "data_admissao", "estado", "criado_em"]
    ordering = ["nome"]


class FamilyDependentViewSet(TenantScopedModelViewSet):
    queryset = FamilyDependent.objects.select_related("funcionario").all()
    serializer_class = FamilyDependentSerializer
    filterset_class = FamilyDependentFilter
    search_fields = ["id_custom", "nome", "funcionario__nome"]
    ordering_fields = ["nome", "parentesco", "criado_em"]
    ordering = ["nome"]


class WorkScheduleViewSet(TenantScopedModelViewSet):
    queryset = WorkSchedule.objects.select_related("funcionario").all()
    serializer_class = WorkScheduleSerializer
    filterset_class = WorkScheduleFilter
    ordering_fields = ["funcionario", "dia_semana", "hora_inicio"]
    ordering = ["funcionario", "dia_semana", "hora_inicio"]


class AbsenceViewSet(TenantScopedModelViewSet):
    queryset = Absence.objects.select_related("funcionario").all()
    serializer_class = AbsenceSerializer
    filterset_class = AbsenceFilter
    ordering_fields = ["data", "criado_em"]
    ordering = ["-data", "-criado_em"]


class VacationViewSet(TenantScopedModelViewSet):
    queryset = Vacation.objects.select_related("funcionario").all()
    serializer_class = VacationSerializer
    filterset_class = VacationFilter
    ordering_fields = ["data_inicio", "estado", "criado_em"]
    ordering = ["-data_inicio", "-criado_em"]


class TerminationViewSet(TenantScopedModelViewSet):
    queryset = Termination.objects.select_related("funcionario").all()
    serializer_class = TerminationSerializer
    filterset_class = TerminationFilter
    ordering_fields = ["data", "tipo", "criado_em"]
    ordering = ["-data", "-criado_em"]


class OvertimeViewSet(TenantScopedModelViewSet):
    queryset = Overtime.objects.select_related("funcionario").all()
    serializer_class = OvertimeSerializer
    filterset_class = OvertimeFilter
    ordering_fields = ["data", "criado_em"]
    ordering = ["-data", "-criado_em"]


class PayrollViewSet(TenantScopedModelViewSet):
    queryset = Payroll.objects.select_related("funcionario").all()
    serializer_class = PayrollSerializer
    filterset_class = PayrollFilter
    ordering_fields = ["ano", "mes", "criado_em", "fechado"]
    ordering = ["-ano", "-mes", "-criado_em"]


VIEWSET_MAP = {
    "cargo": JobTitleViewSet,
    "funcionario": EmployeeViewSet,
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

CargoViewSet = JobTitleViewSet
FuncionarioViewSet = EmployeeViewSet
AgregadoFamiliarViewSet = FamilyDependentViewSet
HorarioTrabalhoViewSet = WorkScheduleViewSet
FaltaViewSet = AbsenceViewSet
FeriasViewSet = VacationViewSet
DispensaViewSet = TerminationViewSet
HoraExtraViewSet = OvertimeViewSet
FolhaPagamentoViewSet = PayrollViewSet
