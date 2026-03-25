from rest_framework import serializers

from apps.payments.models.payment import Payment
from apps.reception.models.reception_checkin import ReceptionCheckin
from core.constants.document_types import TipoDocumento
from core.constants.gender import Genero
from core.constants.laboratory.clinical_status import StatusClinico
from core.constants.provenance import Proveniencia
from core.constants.race_origin import RacaOrigem

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


class ReceptionCheckinSerializer(serializers.ModelSerializer):
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
        choices=StatusClinico.choices,
        required=False,
    )


class CreateReceptionInvoiceSerializer(serializers.Serializer):
    emitir = serializers.BooleanField(default=True)


class RegisterReceptionPaymentSerializer(serializers.Serializer):
    value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
    )
    method = serializers.ChoiceField(
        choices=Payment.Method.choices,
        default=Payment.Method.DINHEIRO,
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
    confirmar = serializers.BooleanField(default=True)

    def validate(self, attrs):
        method = attrs.get("method") or Payment.Method.DINHEIRO
        if method == Payment.Method.SEGURO_SAUDE:
            if not attrs.get("insurer_id"):
                raise serializers.ValidationError(
                    {"insurer_id": "Informe a insurer para payment via seguro de saúde."}
                )
            if not (attrs.get("authorization_number") or "").strip():
                raise serializers.ValidationError(
                    {"authorization_number": "Informe o número de autorização do seguro."}
                )
        return attrs


class PatientFlowSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    address = serializers.CharField(max_length=150)
    birth_date = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=Genero.choices, required=False)
    race_origin = serializers.ChoiceField(choices=RacaOrigem.choices, required=False)
    document_type = serializers.ChoiceField(choices=TipoDocumento.choices, required=False)
    document_number = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    contact = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    provenance = serializers.ChoiceField(choices=Proveniencia.choices, required=False)
    pregnant = serializers.BooleanField(required=False)
    gestational_age_weeks = serializers.IntegerField(required=False, allow_null=True, min_value=0)


class CheckinFlowSerializer(serializers.Serializer):
    priority = serializers.ChoiceField(
        choices=ReceptionCheckin.Priority.choices,
        required=False,
    )
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    iniciar_atendimento = serializers.BooleanField(default=False)


class CareFlowCreateSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField(required=False, min_value=1)
    patient = PatientFlowSerializer(required=False)
    checkin = CheckinFlowSerializer(required=False)
    request = CreateReceptionRequestSerializer(required=False)
    faturamento = CreateReceptionInvoiceSerializer(required=False)
    payment = RegisterReceptionPaymentSerializer(required=False)
    concluir_checkin = serializers.BooleanField(default=False)

    def validate(self, attrs):
        patient_id = attrs.get("patient_id")
        patient = attrs.get("patient")
        request = attrs.get("request")
        faturamento = attrs.get("faturamento")
        payment = attrs.get("payment")

        if not patient_id and not patient:
            raise serializers.ValidationError(
                "Informe `patient_id` para usar um patient existente ou envie `patient` para criar um novo."
            )

        if faturamento and not request:
            raise serializers.ValidationError(
                {"faturamento": "Faturamento na abertura exige criar requisição no mesmo fluxo."}
            )

        if payment and not request:
            raise serializers.ValidationError(
                {"payment": "Pagamento na abertura exige requisição e invoice no mesmo fluxo."}
            )

        return attrs


SERIALIZER_MAP = {
    "checkin": ReceptionCheckinSerializer,
}


CheckinRecepcaoSerializer = ReceptionCheckinSerializer
VincularRequisicaoSerializer = LinkRequestSerializer
VincularFaturaSerializer = LinkInvoiceSerializer
CriarRequisicaoRecepcaoSerializer = CreateReceptionRequestSerializer
CriarFaturaRecepcaoSerializer = CreateReceptionInvoiceSerializer
RegistrarPagamentoRecepcaoSerializer = RegisterReceptionPaymentSerializer
PacienteFluxoSerializer = PatientFlowSerializer
CheckinFluxoSerializer = CheckinFlowSerializer
FluxoAtendimentoCreateSerializer = CareFlowCreateSerializer
