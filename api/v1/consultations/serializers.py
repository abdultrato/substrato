from rest_framework import serializers

from apps.billing.models.invoice import Invoice
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.human_resources.models.employee import Employee

CORE_READ_ONLY_FIELDS = (
    "id",
    "id_custom",
    "inquilino",
    "criado_por",
    "atualizado_por",
    "criado_em",
    "atualizado_em",
    "deletado",
    "deletado_em",
    "deletado_por",
    "versao",
)


class DoctorSerializer(serializers.ModelSerializer):
    cargo_nome = serializers.CharField(source="cargo.nome", read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "nome", "profissao", "cargo", "cargo_nome"]


class MedicalConsultationSerializer(serializers.ModelSerializer):
    # Allow creating a consultation with `especialidade`; the model syncs type/price.
    tipo = serializers.CharField(required=False, allow_blank=True)
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    medico_nome = serializers.SerializerMethodField(method_name="get_doctor_name")
    fatura_id = serializers.SerializerMethodField(method_name="get_invoice_id")
    fatura_codigo = serializers.SerializerMethodField(method_name="get_invoice_code")
    fatura_estado = serializers.SerializerMethodField(method_name="get_invoice_status")

    class Meta:
        model = MedicalConsultation
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "paciente_nome",
            "medico_nome",
            "fatura_id",
            "fatura_codigo",
            "fatura_estado",
            "tipo_horario",
            "multiplicador_preco",
        )

    def get_doctor_name(self, obj: MedicalConsultation) -> str:
        doctor = getattr(obj, "medico", None)
        if not doctor:
            return ""
        return getattr(doctor, "nome", "") or ""

    def _get_invoice(self, obj: MedicalConsultation) -> Invoice | None:
        try:
            return getattr(obj, "fatura", None)
        except Exception:
            return None

    def get_invoice_id(self, obj: MedicalConsultation) -> int | None:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "id", None) if invoice else None

    def get_invoice_code(self, obj: MedicalConsultation) -> str:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "id_custom", "") if invoice else ""

    def get_invoice_status(self, obj: MedicalConsultation) -> str:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "estado", "") if invoice else ""

    def validate(self, attrs):
        attrs = super().validate(attrs)

        specialty = attrs.get("especialidade") or getattr(self.instance, "especialidade", None)

        tipo = (attrs.get("tipo") or getattr(self.instance, "tipo", "") or "").strip()
        if specialty and not tipo:
            attrs["tipo"] = (getattr(specialty, "nome", "") or "").strip()
            tipo = (attrs.get("tipo") or "").strip()

        if not specialty and not tipo:
            raise serializers.ValidationError({"tipo": "Informe o tipo/nome do serviço da consulta."})

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
    agendada_para = serializers.DateTimeField()


class CancelConsultationSerializer(serializers.Serializer):
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=255)


SERIALIZER_MAP = {
    "consulta": MedicalConsultationSerializer,
    "medicos": DoctorSerializer,
    "especialidade": ConsultationSpecialtySerializer,
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
