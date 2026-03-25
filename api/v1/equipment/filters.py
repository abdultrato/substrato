from api.core.filters import SafeFilterSet
from apps.equipment.models.equipment import Equipment
from apps.incidents.models.incident import Incident
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maintenance.models.maintenance import Maintenance


class EquipamentoFilter(SafeFilterSet):
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


class InspecaoDiariaFilter(SafeFilterSet):
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


class ManutencaoFilter(SafeFilterSet):
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


class OcorrenciaFilter(SafeFilterSet):
    class Meta:
        model = Incident
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
    "equipment": EquipamentoFilter,
    "inspecaodiaria": InspecaoDiariaFilter,
    "manutencao": ManutencaoFilter,
    "ocorrencia": OcorrenciaFilter,
}
