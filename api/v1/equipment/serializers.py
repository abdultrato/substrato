from rest_framework import serializers

from apps.equipment.models.equipment import Equipment
from apps.incidents.models.incident import Incident
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maintenance.models.maintenance import Maintenance

CORE_READ_ONLY_FIELDS = [
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
]


def _get_ultima_inspecao(obj: Equipment):
    if hasattr(obj, "_ultima_inspecao_cache"):
        return obj._ultima_inspecao_cache
    ultima = obj.ultima_inspecao()
    obj._ultima_inspecao_cache = ultima
    return ultima


class EquipamentoSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    status_atual = serializers.SerializerMethodField()
    status_atual_label = serializers.SerializerMethodField()
    ultima_inspecao = serializers.SerializerMethodField()

    def get_status(self, obj: Equipment) -> str:
        return obj.status_atual_label or obj.status_atual or ""

    def get_status_atual(self, obj: Equipment) -> str:
        return obj.status_atual

    def get_status_atual_label(self, obj: Equipment) -> str:
        return obj.status_atual_label

    def get_ultima_inspecao(self, obj: Equipment):
        ultima = _get_ultima_inspecao(obj)
        return ultima.date if ultima else None

    class Meta:
        model = Equipment
        fields = "__all__"
        read_only_fields = [
            *CORE_READ_ONLY_FIELDS,
            "status",
            "status_atual",
            "status_atual_label",
            "ultima_inspecao",
        ]
        extra_kwargs = {
            "name": {"required": True},
            "serial_number": {"required": True},
        }


class InspecaoDiariaSerializer(serializers.ModelSerializer):
    description = serializers.SerializerMethodField(method_name="get_description")
    status = serializers.SerializerMethodField()

    def get_description(self, obj: DailyInspection) -> str:
        equipment = getattr(obj, "equipment", None)
        if equipment:
            name = equipment.name or equipment.serial_number or f"Equipamento {equipment.pk}"
            return f"{name} - {obj.date}"
        return str(obj.date)

    def get_status(self, obj: DailyInspection) -> str:
        try:
            return obj.get_operation_status_display()
        except Exception:
            return obj.operation_status or ""

    class Meta:
        model = DailyInspection
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "description", "status"]


class ManutencaoSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    def get_status(self, obj: Maintenance) -> str:
        return "Executada" if obj.executada else "Programada"

    class Meta:
        model = Maintenance
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "status"]


class OcorrenciaSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    def get_status(self, obj: Incident) -> str:
        return "Resolvida" if obj.resolved else "Pendente"

    class Meta:
        model = Incident
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "status"]


SERIALIZER_MAP = {
    "equipment": EquipamentoSerializer,
    "inspecaodiaria": InspecaoDiariaSerializer,
    "manutencao": ManutencaoSerializer,
    "ocorrencia": OcorrenciaSerializer,
}
