from api.core.filters import SafeFilterSet
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.absence import Absence
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.work_schedule import WorkSchedule


class CargoFilter(SafeFilterSet):
    class Meta:
        model = JobTitle
        fields = ["nome", "criado_em"]


class FuncionarioFilter(SafeFilterSet):
    class Meta:
        model = Employee
        fields = ["cargo", "profissao", "estado", "data_admissao", "criado_em"]


class AgregadoFamiliarFilter(SafeFilterSet):
    class Meta:
        model = FamilyDependent
        fields = ["funcionario", "parentesco", "vive_com_funcionario", "criado_em"]


class HorarioTrabalhoFilter(SafeFilterSet):
    class Meta:
        model = WorkSchedule
        fields = ["funcionario", "dia_semana", "ativo"]


class FaltaFilter(SafeFilterSet):
    class Meta:
        model = Absence
        fields = ["funcionario", "data", "justificada"]


class FeriasFilter(SafeFilterSet):
    class Meta:
        model = Vacation
        fields = ["funcionario", "estado", "data_inicio"]


class DispensaFilter(SafeFilterSet):
    class Meta:
        model = Termination
        fields = ["funcionario", "tipo", "data"]


class HoraExtraFilter(SafeFilterSet):
    class Meta:
        model = Overtime
        fields = ["funcionario", "data"]


class FolhaPagamentoFilter(SafeFilterSet):
    class Meta:
        model = Payroll
        fields = ["funcionario", "ano", "mes", "fechado"]


FILTER_MAP = {
    "cargo": CargoFilter,
    "funcionario": FuncionarioFilter,
    "agregadofamiliar": AgregadoFamiliarFilter,
    "horario": HorarioTrabalhoFilter,
    "falta": FaltaFilter,
    "ferias": FeriasFilter,
    "dispensa": DispensaFilter,
    "horaextra": HoraExtraFilter,
    "folhapagamento": FolhaPagamentoFilter,
}
