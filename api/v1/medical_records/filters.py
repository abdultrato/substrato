from api.core.filters import SafeFilterSet  # Base com saneamento
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem


class MedicalRecordEntryFilter(SafeFilterSet):
    class Meta:
        model = MedicalRecordEntry
        fields = [
            "patient",
            "doctor",
            "consultations",
            "status",
            "care_start_at",
            "care_end_at",
            "created_at",
        ]


class PrescriptionItemFilter(SafeFilterSet):
    class Meta:
        model = PrescriptionItem
        fields = [
            "record",
            "medication",
            "dosage_unit",
            "dose_count",
            "created_at",
        ]


FILTER_MAP = {
    "record": MedicalRecordEntryFilter,
    "prescricaoitem": PrescriptionItemFilter,
}

