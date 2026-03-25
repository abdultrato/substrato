from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem

CORE_READ_ONLY_FIELDS = (
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
)


class PrescriptionItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    medication_name = serializers.CharField(source="medication.name", read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "medication_name")


class MedicalRecordEntrySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    doctor_name = serializers.SerializerMethodField(method_name="get_doctor_name")
    consultation_codes = serializers.SerializerMethodField(method_name="get_consultation_codes")

    prescription_items = PrescriptionItemSerializer(source="itens_prescription", many=True, read_only=True)
    legacy_output_aliases = {
        "consultations_codigos": "consultation_codes",
        "itens_prescription": "prescription_items",
    }

    class Meta:
        model = MedicalRecordEntry
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "doctor_name",
            "consultation_codes",
            "prescription_items",
        )

    def get_doctor_name(self, obj: MedicalRecordEntry) -> str:
        doctor = getattr(obj, "doctor", None)
        if not doctor:
            return ""
        return getattr(doctor, "name", "") or ""

    def get_consultation_codes(self, obj: MedicalRecordEntry) -> list[str]:
        try:
            return list(obj.consultations.values_list("custom_id", flat=True))
        except Exception:
            return []


SERIALIZER_MAP = {
    "record": MedicalRecordEntrySerializer,
    "prescricaoitem": PrescriptionItemSerializer,
}

