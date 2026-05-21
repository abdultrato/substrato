"""Serializers para Recepção (check-in, fluxo de atendimento)."""

from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.payments.models.payment import Payment
from apps.reception.models.reception_checkin import ReceptionCheckin
from core.constants.document_types import DocumentType
from core.constants.gender import Gender
from core.constants.laboratory.clinical_status import ClinicalStatus
from core.constants.provenance import Provenance
from core.constants.race_origin import RaceOrigin

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


CHECKIN_LEGACY_ALIASES = {
    "id_custom": "custom_id",
    "codigo": "custom_id",
    "código": "custom_id",
    "paciente": "patient",
    "utente": "patient",
    "patient": "patient",
    "nome_paciente": "patient_name",
    "codigo_paciente": "patient_code",
    "código_paciente": "patient_code",
    "requisicao": "request",
    "requisição": "request",
    "pedido": "request",
    "pedido_laboratorial": "request",
    "request": "request",
    "codigo_requisicao": "request_code",
    "código_requisição": "request_code",
    "fatura": "invoice",
    "factura": "invoice",
    "invoice": "invoice",
    "codigo_fatura": "invoice_code",
    "codigo_factura": "invoice_code",
    "código_fatura": "invoice_code",
    "código_factura": "invoice_code",
    "atendente": "attendant",
    "recepcionista": "attendant",
    "attendant": "attendant",
    "nome_atendente": "attendant_name",
    "prioridade": "priority",
    "priority": "priority",
    "estado": "status",
    "status": "status",
    "estado_legivel": "status_display",
    "estado_legível": "status_display",
    "prioridade_legivel": "priority_display",
    "prioridade_legível": "priority_display",
    "motivo": "reason",
    "razao": "reason",
    "razão": "reason",
    "reason": "reason",
    "observacao": "notes",
    "observação": "notes",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "notes": "notes",
    "chegada": "arrived_at",
    "chegou_em": "arrived_at",
    "data_chegada": "arrived_at",
    "arrived_at": "arrived_at",
    "chamado_em": "called_at",
    "chamada_em": "called_at",
    "inicio_atendimento": "called_at",
    "início_atendimento": "called_at",
    "called_at": "called_at",
    "concluido_em": "completed_at",
    "concluído_em": "completed_at",
    "completed_at": "completed_at",
}


class ReceptionCheckinSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = CHECKIN_LEGACY_ALIASES
    legacy_output_aliases = CHECKIN_LEGACY_ALIASES

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_code = serializers.CharField(source="patient.custom_id", read_only=True)
    request_code = serializers.CharField(source="request.custom_id", read_only=True)
    invoice_code = serializers.CharField(source="invoice.custom_id", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    attendant_name = serializers.SerializerMethodField(method_name="get_attendant_name")

    class Meta:
        model = ReceptionCheckin
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "patient_code",
            "request_code",
            "invoice_code",
            "status_display",
            "priority_display",
            "attendant_name",
        )

    def get_attendant_name(self, obj: ReceptionCheckin) -> str:
        if not obj.attendant_id:
            return ""

        return (
            obj.attendant.get_full_name()
            if hasattr(obj.attendant, "get_full_name")
            else getattr(obj.attendant, "username", "")
        )


class LinkRequestSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()


class LinkInvoiceSerializer(serializers.Serializer):
    invoice_id = serializers.IntegerField()


class CreateReceptionRequestSerializer(serializers.Serializer):
    exams_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
    clinical_status = serializers.ChoiceField(
        choices=ClinicalStatus.choices,
        required=False,
    )


class CreateReceptionInvoiceSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    issue = serializers.BooleanField(default=True)
    legacy_input_aliases = {"emitir": "issue"}
    legacy_output_aliases = {"emitir": "issue"}


class RegisterReceptionPaymentSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
    )
    method = serializers.ChoiceField(
        choices=Payment.Method.choices,
        default=Payment.Method.CASH,
    )
    external_reference = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
    )
    insurer_id = serializers.IntegerField(required=False, min_value=1)
    coverage_plan_id = serializers.IntegerField(required=False, min_value=1)
    authorization_number = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
    )
    insurance_date = serializers.JSONField(required=False, allow_null=True)
    confirm = serializers.BooleanField(default=True)
    legacy_input_aliases = {"confirmar": "confirm"}
    legacy_output_aliases = {"confirmar": "confirm"}

    def validate(self, attrs):
        method = attrs.get("method") or Payment.Method.CASH
        if method == Payment.Method.HEALTH_INSURANCE:
            if not attrs.get("insurer_id"):
                raise serializers.ValidationError({"insurer_id": "Informe a insurer para payment via seguro de saúde."})
            if not (attrs.get("authorization_number") or "").strip():
                raise serializers.ValidationError(
                    {"authorization_number": "Informe o número de autorização do seguro."}
                )
        return attrs


class PatientFlowSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    address = serializers.CharField(max_length=150)
    birth_date = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=Gender.choices, required=False)
    race_origin = serializers.ChoiceField(choices=RaceOrigin.choices, required=False)
    document_type = serializers.ChoiceField(choices=DocumentType.choices, required=False)
    document_number = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    contact = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    provenance = serializers.ChoiceField(choices=Provenance.choices, required=False)
    pregnant = serializers.BooleanField(required=False)
    gestational_age_weeks = serializers.IntegerField(required=False, allow_null=True, min_value=0)


class CheckinFlowSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    priority = serializers.ChoiceField(
        choices=ReceptionCheckin.Priority.choices,
        required=False,
    )
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    start_care = serializers.BooleanField(default=False)
    legacy_input_aliases = {"iniciar_atendimento": "start_care"}
    legacy_output_aliases = {"iniciar_atendimento": "start_care"}


class CareFlowCreateSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    patient_id = serializers.IntegerField(required=False, min_value=1)
    patient = PatientFlowSerializer(required=False)
    checkin = CheckinFlowSerializer(required=False)
    request = CreateReceptionRequestSerializer(required=False)
    billing = CreateReceptionInvoiceSerializer(required=False)
    payment = RegisterReceptionPaymentSerializer(required=False)
    complete_checkin = serializers.BooleanField(default=False)
    legacy_input_aliases = {
        "faturamento": "billing",
        "concluir_checkin": "complete_checkin",
    }
    legacy_output_aliases = {
        "faturamento": "billing",
        "concluir_checkin": "complete_checkin",
    }

    def validate(self, attrs):
        patient_id = attrs.get("patient_id")
        patient = attrs.get("patient")
        request = attrs.get("request")
        payment = attrs.get("payment")

        if not patient_id and not patient:
            raise serializers.ValidationError(
                "Informe `patient_id` para usar um patient existente ou envie `patient` para criar um novo."
            )

        if payment and not request:
            raise serializers.ValidationError(
                {"payment": "Pagamento na abertura exige requisição e invoice no mesmo fluxo."}
            )

        return attrs


SERIALIZER_MAP = {
    "checkin": ReceptionCheckinSerializer,
}
