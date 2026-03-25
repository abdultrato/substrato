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


def _get_last_inspection(obj: Equipment):
    if hasattr(obj, "_last_inspection_cache"):
        return obj._last_inspection_cache
    last_inspection = obj.last_inspection()
    obj._last_inspection_cache = last_inspection
    return last_inspection


class EquipmentSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()
    current_status_label = serializers.SerializerMethodField()
    last_inspection = serializers.SerializerMethodField()

    def get_status(self, obj: Equipment) -> str:
        return obj.current_status_label or obj.current_status or ""

    def get_current_status(self, obj: Equipment) -> str:
        return obj.current_status

    def get_current_status_label(self, obj: Equipment) -> str:
        return obj.current_status_label

    def get_last_inspection(self, obj: Equipment):
        last_inspection = _get_last_inspection(obj)
        return last_inspection.date if last_inspection else None

    class Meta:
        model = Equipment
        fields = "__all__"
        read_only_fields = [
            *CORE_READ_ONLY_FIELDS,
            "status",
            "current_status",
            "current_status_label",
            "last_inspection",
        ]
        extra_kwargs = {
            "name": {"required": True},
            "serial_number": {"required": True},
        }


class DailyInspectionSerializer(serializers.ModelSerializer):
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


class MaintenanceSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    def get_status(self, obj: Maintenance) -> str:
        return "Executada" if obj.performed else "Programada"

    class Meta:
        model = Maintenance
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "status"]


class IncidentSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    def get_status(self, obj: Incident) -> str:
        return "Resolvida" if obj.resolved else "Pendente"

    class Meta:
        model = Incident
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "status"]


SERIALIZER_MAP = {
    "equipment": EquipmentSerializer,
    "daily_inspection": DailyInspectionSerializer,
    "maintenance": MaintenanceSerializer,
    "incident": IncidentSerializer,
    "inspecaodiaria": DailyInspectionSerializer,
    "manutencao": MaintenanceSerializer,
    "ocorrencia": IncidentSerializer,
}
