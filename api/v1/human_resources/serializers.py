from rest_framework import serializers

from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.absence import Absence
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.work_schedule import WorkSchedule


class CargoSerializer(serializers.ModelSerializer):
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


class FuncionarioSerializer(serializers.ModelSerializer):
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


class AgregadoFamiliarSerializer(serializers.ModelSerializer):
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


class HorarioTrabalhoSerializer(serializers.ModelSerializer):
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


class FaltaSerializer(serializers.ModelSerializer):
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


class FeriasSerializer(serializers.ModelSerializer):
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


class DispensaSerializer(serializers.ModelSerializer):
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


class HoraExtraSerializer(serializers.ModelSerializer):
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


class FolhaPagamentoSerializer(serializers.ModelSerializer):
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
    "cargo": CargoSerializer,
    "funcionario": FuncionarioSerializer,
    "agregadofamiliar": AgregadoFamiliarSerializer,
    "horario": HorarioTrabalhoSerializer,
    "falta": FaltaSerializer,
    "ferias": FeriasSerializer,
    "dispensa": DispensaSerializer,
    "horaextra": HoraExtraSerializer,
    "folhapagamento": FolhaPagamentoSerializer,
}
