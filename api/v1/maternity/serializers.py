from rest_framework import serializers

from apps.maternity.models.pregnancy import Pregnancy

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


class PregnancySerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    doctor_name = serializers.SerializerMethodField(method_name="get_doctor_name")

    class Meta:
        model = Pregnancy
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "doctor_name")

    def get_doctor_name(self, obj: Pregnancy) -> str:
        doctor = getattr(obj, "responsible_doctor", None)
        if not doctor:
            return ""
        return getattr(doctor, "name", "") or ""


SERIALIZER_MAP = {
    "gestacao": PregnancySerializer,
}

