from rest_framework import serializers

from apps.billing.models.invoice import Invoice
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.human_resources.models.employee import Employee

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


class DoctorSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "name", "profession", "role", "role_name"]


class MedicalConsultationSerializer(serializers.ModelSerializer):
    # Allow creating a consultation with `specialty`; the model syncs type/price.
    type = serializers.CharField(required=False, allow_blank=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    doctor_name = serializers.SerializerMethodField(method_name="get_doctor_name")
    invoice_id = serializers.SerializerMethodField(method_name="get_invoice_id")
    invoice_code = serializers.SerializerMethodField(method_name="get_invoice_code")
    invoice_status = serializers.SerializerMethodField(method_name="get_invoice_status")

    class Meta:
        model = MedicalConsultation
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "doctor_name",
            "invoice_id",
            "invoice_code",
            "invoice_status",
            "schedule_type",
            "price_multiplier",
        )

    def get_doctor_name(self, obj: MedicalConsultation) -> str:
        doctor = getattr(obj, "doctor", None)
        if not doctor:
            return ""
        return getattr(doctor, "name", "") or ""

    def _get_invoice(self, obj: MedicalConsultation) -> Invoice | None:
        try:
            return getattr(obj, "invoice", None)
        except Exception:
            return None

    def get_invoice_id(self, obj: MedicalConsultation) -> int | None:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "id", None) if invoice else None

    def get_invoice_code(self, obj: MedicalConsultation) -> str:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "custom_id", "") if invoice else ""

    def get_invoice_status(self, obj: MedicalConsultation) -> str:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "status", "") if invoice else ""

    def validate(self, attrs):
        attrs = super().validate(attrs)

        specialty = attrs.get("specialty") or getattr(self.instance, "specialty", None)

        type = (attrs.get("type") or getattr(self.instance, "type", "") or "").strip()
        if specialty and not type:
            attrs["type"] = (getattr(specialty, "name", "") or "").strip()
            type = (attrs.get("type") or "").strip()

        if not specialty and not type:
            raise serializers.ValidationError({"type": "Informe o type/name do serviço da consultation."})

        return attrs


class ConsultationSpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultationSpecialty
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class CreateConsultationInvoiceSerializer(serializers.Serializer):
    emitir = serializers.BooleanField(default=True)


class RescheduleConsultationSerializer(serializers.Serializer):
    scheduled_for = serializers.DateTimeField()


class CancelConsultationSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


SERIALIZER_MAP = {
    "consultation": MedicalConsultationSerializer,
    "medicos": DoctorSerializer,
    "specialty": ConsultationSpecialtySerializer,
    "feriado": HolidaySerializer,
}

# Backwards-compatible aliases while callers are updated incrementally.
MedicoSerializer = DoctorSerializer
ConsultaMedicaSerializer = MedicalConsultationSerializer
EspecialidadeConsultaSerializer = ConsultationSpecialtySerializer
FeriadoSerializer = HolidaySerializer
CriarFaturaConsultaSerializer = CreateConsultationInvoiceSerializer
RemarcarConsultaSerializer = RescheduleConsultationSerializer
CancelarConsultaSerializer = CancelConsultationSerializer
