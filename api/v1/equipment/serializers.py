from rest_framework import serializers

from apps.equipment.models.equipment import Equipment
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maintenance.models.maintenance import Maintenance
from apps.incidents.models.incident import Incident

CORE_READ_ONLY_FIELDS = [
    "id",
    "id_custom",
    "inquilino",
    "criado_por",
    "atualizado_por",
    "criado_em",
    "atualizado_em",
    "deletado",
    "deletado_em",
    "deletado_por",
    "versao",
]


def _get_ultima_inspecao(obj: Equipment):
    if hasattr(obj, "_ultima_inspecao_cache"):
        return getattr(obj, "_ultima_inspecao_cache")
    ultima = obj.ultima_inspecao()
    setattr(obj, "_ultima_inspecao_cache", ultima)
    return ultima


class EquipamentoSerializer(serializers.ModelSerializer):
    estado = serializers.SerializerMethodField()
    estado_atual = serializers.SerializerMethodField()
    estado_atual_label = serializers.SerializerMethodField()
    ultima_inspecao = serializers.SerializerMethodField()

    def get_estado(self, obj: Equipment) -> str:
        return obj.estado_atual_label or obj.estado_atual or ""

    def get_estado_atual(self, obj: Equipment) -> str:
        return obj.estado_atual

    def get_estado_atual_label(self, obj: Equipment) -> str:
        return obj.estado_atual_label

    def get_ultima_inspecao(self, obj: Equipment):
        ultima = _get_ultima_inspecao(obj)
        return ultima.data if ultima else None

    class Meta:
        model = Equipment
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "estado",
            "estado_atual",
            "estado_atual_label",
            "ultima_inspecao",
        ]
        extra_kwargs = {
            "nome": {"required": True},
            "numero_serie": {"required": True},
        }


class InspecaoDiariaSerializer(serializers.ModelSerializer):
    descricao = serializers.SerializerMethodField()
    estado = serializers.SerializerMethodField()

    def get_descricao(self, obj: DailyInspection) -> str:
        equipamento = getattr(obj, "equipamento", None)
        if equipamento:
            nome = equipamento.nome or equipamento.numero_serie or f"Equipamento {equipamento.pk}"
            return f"{nome} - {obj.data}"
        return str(obj.data)

    def get_estado(self, obj: DailyInspection) -> str:
        try:
            return obj.get_funcionamento_display()
        except Exception:
            return obj.funcionamento or ""

    class Meta:
        model = DailyInspection
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ["descricao", "estado"]


class ManutencaoSerializer(serializers.ModelSerializer):
    estado = serializers.SerializerMethodField()

    def get_estado(self, obj: Maintenance) -> str:
        return "Executada" if obj.executada else "Programada"

    class Meta:
        model = Maintenance
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ["estado"]


class OcorrenciaSerializer(serializers.ModelSerializer):
    estado = serializers.SerializerMethodField()

    def get_estado(self, obj: Incident) -> str:
        return "Resolvida" if obj.resolvido else "Pendente"

    class Meta:
        model = Incident
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ["estado"]


SERIALIZER_MAP = {
    "equipamento": EquipamentoSerializer,
    "inspecaodiaria": InspecaoDiariaSerializer,
    "manutencao": ManutencaoSerializer,
    "ocorrencia": OcorrenciaSerializer,
}
