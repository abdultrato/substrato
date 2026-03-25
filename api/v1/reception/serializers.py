from rest_framework import serializers

from apps.payments.models.payment import Payment
from apps.reception.models.reception_checkin import ReceptionCheckin
from core.constants.document_types import TipoDocumento
from core.constants.genero import Genero
from core.constants.laboratory.clinical_status import StatusClinico
from core.constants.provenance import Proveniencia
from core.constants.raca_origem import RacaOrigem

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


class ReceptionCheckinSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    paciente_codigo = serializers.CharField(source="paciente.id_custom", read_only=True)
    requisicao_codigo = serializers.CharField(source="requisicao.id_custom", read_only=True)
    fatura_codigo = serializers.CharField(source="fatura.id_custom", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    prioridade_display = serializers.CharField(source="get_prioridade_display", read_only=True)
    atendente_nome = serializers.SerializerMethodField(method_name="get_attendant_name")

    class Meta:
        model = ReceptionCheckin
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "paciente_nome",
            "paciente_codigo",
            "requisicao_codigo",
            "fatura_codigo",
            "estado_display",
            "prioridade_display",
            "atendente_nome",
        )

    def get_attendant_name(self, obj: ReceptionCheckin) -> str:
        if not obj.atendente_id:
            return ""

        return (
            obj.atendente.get_full_name()
            if hasattr(obj.atendente, "get_full_name")
            else getattr(obj.atendente, "username", "")
        )


class LinkRequestSerializer(serializers.Serializer):
    requisicao_id = serializers.IntegerField()


class LinkInvoiceSerializer(serializers.Serializer):
    fatura_id = serializers.IntegerField()


class CreateReceptionRequestSerializer(serializers.Serializer):
    exames_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
    status_clinico = serializers.ChoiceField(
        choices=StatusClinico.choices,
        required=False,
    )


class CreateReceptionInvoiceSerializer(serializers.Serializer):
    emitir = serializers.BooleanField(default=True)


class RegisterReceptionPaymentSerializer(serializers.Serializer):
    valor = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
    )
    metodo = serializers.ChoiceField(
        choices=Payment.Method.choices,
        default=Payment.Method.DINHEIRO,
    )
    referencia_externa = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
    )
    seguradora_id = serializers.IntegerField(required=False, min_value=1)
    plano_cobertura_id = serializers.IntegerField(required=False, min_value=1)
    numero_autorizacao = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
    )
    dados_seguro = serializers.JSONField(required=False, allow_null=True)
    confirmar = serializers.BooleanField(default=True)

    def validate(self, attrs):
        metodo = attrs.get("metodo") or Payment.Method.DINHEIRO
        if metodo == Payment.Method.SEGURO_SAUDE:
            if not attrs.get("seguradora_id"):
                raise serializers.ValidationError(
                    {"seguradora_id": "Informe a seguradora para pagamento via seguro de saúde."}
                )
            if not (attrs.get("numero_autorizacao") or "").strip():
                raise serializers.ValidationError(
                    {"numero_autorizacao": "Informe o número de autorização do seguro."}
                )
        return attrs


class PatientFlowSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=120)
    morada = serializers.CharField(max_length=150)
    data_nascimento = serializers.DateField(required=False, allow_null=True)
    genero = serializers.ChoiceField(choices=Genero.choices, required=False)
    raca_origem = serializers.ChoiceField(choices=RacaOrigem.choices, required=False)
    tipo_documento = serializers.ChoiceField(choices=TipoDocumento.choices, required=False)
    numero_id = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    contacto = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    proveniencia = serializers.ChoiceField(choices=Proveniencia.choices, required=False)
    gestante = serializers.BooleanField(required=False)
    idade_gestacional_semanas = serializers.IntegerField(required=False, allow_null=True, min_value=0)


class CheckinFlowSerializer(serializers.Serializer):
    prioridade = serializers.ChoiceField(
        choices=ReceptionCheckin.Priority.choices,
        required=False,
    )
    motivo = serializers.CharField(max_length=255, required=False, allow_blank=True)
    observacoes = serializers.CharField(required=False, allow_blank=True)
    iniciar_atendimento = serializers.BooleanField(default=False)


class CareFlowCreateSerializer(serializers.Serializer):
    paciente_id = serializers.IntegerField(required=False, min_value=1)
    paciente = PatientFlowSerializer(required=False)
    checkin = CheckinFlowSerializer(required=False)
    requisicao = CreateReceptionRequestSerializer(required=False)
    faturamento = CreateReceptionInvoiceSerializer(required=False)
    pagamento = RegisterReceptionPaymentSerializer(required=False)
    concluir_checkin = serializers.BooleanField(default=False)

    def validate(self, attrs):
        paciente_id = attrs.get("paciente_id")
        paciente = attrs.get("paciente")
        requisicao = attrs.get("requisicao")
        faturamento = attrs.get("faturamento")
        pagamento = attrs.get("pagamento")

        if not paciente_id and not paciente:
            raise serializers.ValidationError(
                "Informe `paciente_id` para usar um paciente existente ou envie `paciente` para criar um novo."
            )

        if faturamento and not requisicao:
            raise serializers.ValidationError(
                {"faturamento": "Faturamento na abertura exige criar requisição no mesmo fluxo."}
            )

        if pagamento and not requisicao:
            raise serializers.ValidationError(
                {"pagamento": "Pagamento na abertura exige requisição e fatura no mesmo fluxo."}
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
