from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
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


DOCTOR_LEGACY_ALIASES = {
    "nome": "name",
    "medico": "name",
    "médico": "name",
    "profissao": "profession_name",
    "profissão": "profession_name",
    "cargo_nome": "role_name",
    "funcao": "role_name",
    "função": "role_name",
    "id_custom": "custom_id",
}

CONSULTATION_SPECIALTY_LEGACY_ALIASES = {
    "nome": "name",
    "especialidade": "name",
    "tipo_consulta": "name",
    "servico": "name",
    "serviço": "name",
    "descricao": "description",
    "descrição": "description",
    "preco": "base_price",
    "preço": "base_price",
    "preco_base": "base_price",
    "preço_base": "base_price",
    "iva": "vat_percentage",
    "percentagem_iva": "vat_percentage",
    "percentual_iva": "vat_percentage",
    "ativo": "active",
    "id_custom": "custom_id",
}

MEDICAL_CONSULTATION_LEGACY_ALIASES = {
    "id_custom": "custom_id",
    "paciente": "patient",
    "utente": "patient",
    "paciente_codigo": "patient",
    "paciente_código": "patient",
    "paciente_nome": "patient_name",
    "medico": "doctor",
    "médico": "doctor",
    "doutor": "doctor",
    "profissional": "doctor",
    "medico_nome": "doctor_name",
    "médico_nome": "doctor_name",
    "especialidade": "specialty",
    "tipo_consulta": "specialty",
    "servico": "specialty",
    "serviço": "specialty",
    "tipo": "type",
    "descricao": "description",
    "descrição": "description",
    "agendada_para": "scheduled_for",
    "marcada_para": "scheduled_for",
    "remarcada_para": "scheduled_for",
    "data_hora": "scheduled_for",
    "data_consulta": "scheduled_for",
    "hora_consulta": "scheduled_for",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "preco": "price",
    "preço": "price",
    "valor": "price",
    "multiplicador_preco": "price_multiplier",
    "multiplicador_preço": "price_multiplier",
    "tipo_horario": "schedule_type",
    "tipo_horário": "schedule_type",
    "feriado_manual": "manual_holiday",
    "feriado": "manual_holiday",
    "concluida_em": "completed_at",
    "concluída_em": "completed_at",
    "cancelada_em": "canceled_at",
    "fatura_id": "invoice_id",
    "factura_id": "invoice_id",
    "fatura_codigo": "invoice_code",
    "factura_codigo": "invoice_code",
    "factura_código": "invoice_code",
    "fatura_estado": "invoice_status",
    "factura_estado": "invoice_status",
}


class DoctorSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_output_aliases = DOCTOR_LEGACY_ALIASES
    role_name = serializers.CharField(source="role.name", read_only=True)
    profession_name = serializers.CharField(source="profession.name", read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "custom_id", "name", "profession", "profession_name", "role", "role_name"]


class MedicalConsultationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = MEDICAL_CONSULTATION_LEGACY_ALIASES
    legacy_output_aliases = MEDICAL_CONSULTATION_LEGACY_ALIASES
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


class ConsultationSpecialtySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = CONSULTATION_SPECIALTY_LEGACY_ALIASES
    legacy_output_aliases = CONSULTATION_SPECIALTY_LEGACY_ALIASES

    class Meta:
        model = ConsultationSpecialty
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class HolidaySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        "nome": "description",
        "feriado": "description",
        "data": "date",
        "data_feriado": "date",
        "descricao": "description",
        "descrição": "description",
        "ativo": "active",
        "id_custom": "custom_id",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = Holiday
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class CreateConsultationInvoiceSerializer(serializers.Serializer):
    issue = serializers.BooleanField(default=True, required=False)
    emitir = serializers.BooleanField(default=None, required=False, write_only=True)

    def validate(self, attrs):
        # Portuguese alias support: prefer explicit `issue`, fall back to `emitir`.
        if attrs.get("issue") is None and attrs.get("emitir") is not None:
            attrs["issue"] = attrs["emitir"]
        attrs.pop("emitir", None)
        # Default to True when nothing was provided.
        attrs.setdefault("issue", True)
        return attrs


class RescheduleConsultationSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    legacy_input_aliases = {"agendada_para": "scheduled_for"}
    legacy_output_aliases = {"agendada_para": "scheduled_for"}
    scheduled_for = serializers.DateTimeField()


class CancelConsultationSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    legacy_input_aliases = {"motivo": "reason"}
    legacy_output_aliases = {"motivo": "reason"}
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


SERIALIZER_MAP = {
    "consultation": MedicalConsultationSerializer,
    "medicos": DoctorSerializer,
    "specialty": ConsultationSpecialtySerializer,
    "feriado": HolidaySerializer,
}

# Backwards-compatible aliases while callers are updated incrementally.
