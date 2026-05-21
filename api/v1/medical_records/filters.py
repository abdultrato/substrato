from api.core.filters import SafeFilterSet  # Base com saneamento
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem


class MedicalRecordEntryFilter(SafeFilterSet):
    class Meta:
        model = MedicalRecordEntry
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "deleted_at",
            "created_by",
            "updated_by",
            "patient",
            "doctor",
            "consultations",
            "status",
            "care_start_at",
            "care_end_at",
            "created_at",
            "updated_at",
        ]


class PrescriptionItemFilter(SafeFilterSet):
    class Meta:
        model = PrescriptionItem
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "deleted_at",
            "created_by",
            "updated_by",
            "record",
            "position",
            "medication",
            "dosage_value",
            "dosage_unit",
            "interval_hours",
            "dose_count",
            "created_at",
            "updated_at",
        ]


FILTER_MAP = {
    "record": MedicalRecordEntryFilter,
    "prescricaoitem": PrescriptionItemFilter,
}

