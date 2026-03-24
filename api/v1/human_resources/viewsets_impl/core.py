from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.absence import Absence
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.work_schedule import WorkSchedule

from ..filters import (
    AgregadoFamiliarFilter,
    CargoFilter,
    DispensaFilter,
    FaltaFilter,
    FeriasFilter,
    FolhaPagamentoFilter,
    FuncionarioFilter,
    HoraExtraFilter,
    HorarioTrabalhoFilter,
)
from ..serializers import (
    AgregadoFamiliarSerializer,
    CargoSerializer,
    DispensaSerializer,
    FaltaSerializer,
    FeriasSerializer,
    FolhaPagamentoSerializer,
    FuncionarioSerializer,
    HoraExtraSerializer,
    HorarioTrabalhoSerializer,
)


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class CargoViewSet(TenantScopedModelViewSet):
    queryset = JobTitle.objects.all()
    serializer_class = CargoSerializer
    filterset_class = CargoFilter
    search_fields = ["id_custom", "nome"]
    ordering_fields = ["nome", "criado_em"]
    ordering = ["nome"]


class FuncionarioViewSet(TenantScopedModelViewSet):
    queryset = Employee.objects.select_related("cargo").all()
    serializer_class = FuncionarioSerializer
    filterset_class = FuncionarioFilter
    search_fields = ["id_custom", "nome", "profissao", "email", "telefone"]
    ordering_fields = ["nome", "profissao", "data_admissao", "estado", "criado_em"]
    ordering = ["nome"]


class AgregadoFamiliarViewSet(TenantScopedModelViewSet):
    queryset = FamilyDependent.objects.select_related("funcionario").all()
    serializer_class = AgregadoFamiliarSerializer
    filterset_class = AgregadoFamiliarFilter
    search_fields = ["id_custom", "nome", "funcionario__nome"]
    ordering_fields = ["nome", "parentesco", "criado_em"]
    ordering = ["nome"]


class HorarioTrabalhoViewSet(TenantScopedModelViewSet):
    queryset = WorkSchedule.objects.select_related("funcionario").all()
    serializer_class = HorarioTrabalhoSerializer
    filterset_class = HorarioTrabalhoFilter
    ordering_fields = ["funcionario", "dia_semana", "hora_inicio"]
    ordering = ["funcionario", "dia_semana", "hora_inicio"]


class FaltaViewSet(TenantScopedModelViewSet):
    queryset = Absence.objects.select_related("funcionario").all()
    serializer_class = FaltaSerializer
    filterset_class = FaltaFilter
    ordering_fields = ["data", "criado_em"]
    ordering = ["-data", "-criado_em"]


class FeriasViewSet(TenantScopedModelViewSet):
    queryset = Vacation.objects.select_related("funcionario").all()
    serializer_class = FeriasSerializer
    filterset_class = FeriasFilter
    ordering_fields = ["data_inicio", "estado", "criado_em"]
    ordering = ["-data_inicio", "-criado_em"]


class DispensaViewSet(TenantScopedModelViewSet):
    queryset = Termination.objects.select_related("funcionario").all()
    serializer_class = DispensaSerializer
    filterset_class = DispensaFilter
    ordering_fields = ["data", "tipo", "criado_em"]
    ordering = ["-data", "-criado_em"]


class HoraExtraViewSet(TenantScopedModelViewSet):
    queryset = Overtime.objects.select_related("funcionario").all()
    serializer_class = HoraExtraSerializer
    filterset_class = HoraExtraFilter
    ordering_fields = ["data", "criado_em"]
    ordering = ["-data", "-criado_em"]


class FolhaPagamentoViewSet(TenantScopedModelViewSet):
    queryset = Payroll.objects.select_related("funcionario").all()
    serializer_class = FolhaPagamentoSerializer
    filterset_class = FolhaPagamentoFilter
    ordering_fields = ["ano", "mes", "criado_em", "fechado"]
    ordering = ["-ano", "-mes", "-criado_em"]


VIEWSET_MAP = {
    "cargo": CargoViewSet,
    "funcionario": FuncionarioViewSet,
    "agregadofamiliar": AgregadoFamiliarViewSet,
    "horario": HorarioTrabalhoViewSet,
    "falta": FaltaViewSet,
    "ferias": FeriasViewSet,
    "dispensa": DispensaViewSet,
    "horaextra": HoraExtraViewSet,
    "folhapagamento": FolhaPagamentoViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AgregadoFamiliarViewSet",
    "CargoViewSet",
    "DispensaViewSet",
    "FaltaViewSet",
    "FeriasViewSet",
    "FolhaPagamentoViewSet",
    "FuncionarioViewSet",
    "HoraExtraViewSet",
    "HorarioTrabalhoViewSet",
]
