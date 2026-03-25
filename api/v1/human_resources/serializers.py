from rest_framework import serializers

from apps.human_resources.models.absence import Absence
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.work_schedule import WorkSchedule


class JobTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobTitle
        fields = "__all__"
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
        )


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = "__all__"
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
        )


class FamilyDependentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyDependent
        fields = "__all__"
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
        )


class WorkScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkSchedule
        fields = "__all__"
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
        )


class AbsenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Absence
        fields = "__all__"
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
        )


class VacationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vacation
        fields = "__all__"
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
        )


class TerminationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Termination
        fields = "__all__"
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
        )


class OvertimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Overtime
        fields = "__all__"
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
        )


class PayrollSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payroll
        fields = "__all__"
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
            "horas_extras_apuradas",
            "valor_hora",
            "valor_horas_extras",
            "salario_total",
        )


SERIALIZER_MAP = {
    "cargo": JobTitleSerializer,
    "funcionario": EmployeeSerializer,
    "agregadofamiliar": FamilyDependentSerializer,
    "horario": WorkScheduleSerializer,
    "falta": AbsenceSerializer,
    "ferias": VacationSerializer,
    "dispensa": TerminationSerializer,
    "horaextra": OvertimeSerializer,
    "folhapagamento": PayrollSerializer,
}

CargoSerializer = JobTitleSerializer
FuncionarioSerializer = EmployeeSerializer
AgregadoFamiliarSerializer = FamilyDependentSerializer
HorarioTrabalhoSerializer = WorkScheduleSerializer
FaltaSerializer = AbsenceSerializer
FeriasSerializer = VacationSerializer
DispensaSerializer = TerminationSerializer
HoraExtraSerializer = OvertimeSerializer
FolhaPagamentoSerializer = PayrollSerializer
