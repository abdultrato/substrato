from api.core.filters import SafeFilterSet  # Base com saneamento
from apps.equipment.models.equipment import Equipment
from apps.incidents.models.incident import Incident
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maintenance.models.maintenance import Maintenance


class EquipmentFilter(SafeFilterSet):
    class Meta:
        model = Equipment
        fields = [
            "tenant",
            "custom_id",
            "name",
            "serial_number",
            "acquisition_date",
            "acquisition_status",
            "initial_operational_status",
            "initial_failure_type",
            "manufacturer",
            "model",
            "location",
            "responsible",
            "active",
            "deleted",
            "created_at",
            "updated_at",
        ]


class DailyInspectionFilter(SafeFilterSet):
    class Meta:
        model = DailyInspection
        fields = [
            "tenant",
            "custom_id",
            "equipment",
            "date",
            "operation_status",
            "cleaning_performed",
            "deleted",
            "created_at",
            "updated_at",
        ]


class MaintenanceFilter(SafeFilterSet):
    class Meta:
        model = Maintenance
        fields = [
            "tenant",
            "custom_id",
            "equipment",
            "type",
            "scheduled_date",
            "performed_date",
            "technician",
            "deleted",
            "created_at",
            "updated_at",
        ]


class IncidentFilter(SafeFilterSet):
    class Meta:
        model = Incident  # Filtros para ocorrências de equipamentos
        fields = [
            "tenant",
            "custom_id",
            "equipment",
            "date",
            "type",
            "resolved",
            "deleted",
            "created_at",
            "updated_at",
        ]


FILTER_MAP = {
    "equipment": EquipmentFilter,
    "daily_inspection": DailyInspectionFilter,
    "maintenance": MaintenanceFilter,
    "incident": IncidentFilter,
    "inspecaodiaria": DailyInspectionFilter,
    "manutencao": MaintenanceFilter,
    "ocorrencia": IncidentFilter,
}
