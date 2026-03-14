from rest_framework import serializers

from aplicativos.recursos_humanos.modelos.agregado_familiar import AgregadoFamiliar
from aplicativos.recursos_humanos.modelos.cargo import Cargo
from aplicativos.recursos_humanos.modelos.dispensa import Dispensa
from aplicativos.recursos_humanos.modelos.falta import Falta
from aplicativos.recursos_humanos.modelos.ferias import Ferias
from aplicativos.recursos_humanos.modelos.folha_pagamento import FolhaPagamento
from aplicativos.recursos_humanos.modelos.funcionario import Funcionario
from aplicativos.recursos_humanos.modelos.hora_extra import HoraExtra
from aplicativos.recursos_humanos.modelos.horario_trabalho import HorarioTrabalho


class CargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cargo
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
        model = Funcionario
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
        model = AgregadoFamiliar
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
        model = HorarioTrabalho
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
        model = Falta
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
        model = Ferias
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
        model = Dispensa
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
        model = HoraExtra
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
        model = FolhaPagamento
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
