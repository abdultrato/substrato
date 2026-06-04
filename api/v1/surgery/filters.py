"""FilterSets para recursos de Cirurgia na API v1."""

from api.core.filters import SafeFilterSet
from apps.surgery.models import (
    AnesthesiaRecord,
    LargeSurgery,
    OperatingRoom,
    OperativeReport,
    RecoveryRecord,
    SmallSurgery,
    Surgery,
    SurgicalConsumption,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalSafetyChecklist,
    SurgicalSchedule,
    SurgicalTeamMember,
)

BASE_FIELDS = ["tenant", "custom_id", "deleted", "created_at", "updated_at"]


class SurgeryFilter(SafeFilterSet):
    class Meta:
        model = Surgery
        fields = [
            "patient",
            "surgeon",
            "status",
            "surgery_size",
            "scheduled_for",
            "created_at",
        ]


class SmallSurgeryFilter(SafeFilterSet):
    class Meta:
        model = SmallSurgery
        fields = SurgeryFilter.Meta.fields


class LargeSurgeryFilter(SafeFilterSet):
    class Meta:
        model = LargeSurgery
        fields = SurgeryFilter.Meta.fields


class SurgicalProcedureFilter(SafeFilterSet):
    class Meta:
        model = SurgicalProcedure
        fields = ["name", "active", "created_at"]


class OperatingRoomFilter(SafeFilterSet):
    class Meta:
        model = OperatingRoom
        fields = [*BASE_FIELDS, "code", "room_type", "status", "sterile"]


class SurgicalScheduleFilter(SafeFilterSet):
    class Meta:
        model = SurgicalSchedule
        fields = [*BASE_FIELDS, "surgery", "operating_room", "status", "priority", "scheduled_start", "scheduled_end"]


class SurgicalTeamMemberFilter(SafeFilterSet):
    class Meta:
        model = SurgicalTeamMember
        fields = [*BASE_FIELDS, "surgery", "employee", "role", "lead", "present"]


class AnesthesiaRecordFilter(SafeFilterSet):
    class Meta:
        model = AnesthesiaRecord
        fields = [*BASE_FIELDS, "surgery", "anesthetist", "anesthesia_type", "asa_class", "status", "started_at", "ended_at"]


class SurgicalSafetyChecklistFilter(SafeFilterSet):
    class Meta:
        model = SurgicalSafetyChecklist
        fields = [*BASE_FIELDS, "surgery", "completed_by", "phase", "completed_at"]


class SurgicalMaterialFilter(SafeFilterSet):
    class Meta:
        model = SurgicalMaterial
        fields = [*BASE_FIELDS, "code", "product", "material_type", "unit", "reusable", "sterile", "active"]


class SurgicalConsumptionFilter(SafeFilterSet):
    class Meta:
        model = SurgicalConsumption
        fields = [*BASE_FIELDS, "surgery", "material", "product", "consumed_by", "consumed_at", "batch_number"]


class RecoveryRecordFilter(SafeFilterSet):
    class Meta:
        model = RecoveryRecord
        fields = [*BASE_FIELDS, "surgery", "nurse", "status", "admitted_at", "discharged_at"]


class OperativeReportFilter(SafeFilterSet):
    class Meta:
        model = OperativeReport
        fields = [*BASE_FIELDS, "surgery", "primary_surgeon", "status", "specimen_sent_to_pathology", "signed_at"]


FILTER_MAP = {
    "surgery": SurgeryFilter,
    "small_surgery": SmallSurgeryFilter,
    "large_surgery": LargeSurgeryFilter,
    "surgical_procedure": SurgicalProcedureFilter,
    "agenda_cirurgica": SurgicalScheduleFilter,
    "centro_cirurgico": OperatingRoomFilter,
    "equipa_cirurgica": SurgicalTeamMemberFilter,
    "anestesia": AnesthesiaRecordFilter,
    "checklist_seguranca": SurgicalSafetyChecklistFilter,
    "materiais": SurgicalMaterialFilter,
    "consumos": SurgicalConsumptionFilter,
    "recuperacao": RecoveryRecordFilter,
    "relatorio_operatorio": OperativeReportFilter,
}
