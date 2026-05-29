from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.credit_financing.models import (
    CreditInstallment,
    ElectiveProcedureFinancing,
    HealthConsortium,
    ReimbursementClaim,
    StudentFunding,
)

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

BASE_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "paciente": "patient",
    "fatura": "invoice",
    "empresa": "sponsor_company",
    "valor": "amount",
    "inicio": "start_date",
    "início": "start_date",
}


class HealthConsortiumSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    sponsor_company_name = serializers.CharField(source="sponsor_company.name", read_only=True)
    invoice_label = serializers.CharField(source="invoice.custom_id", read_only=True)
    expected_total_contribution = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    admin_fee_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "tipo_consorcio": "consortium_type",
        "tipo_consórcio": "consortium_type",
        "beneficiario": "patient",
        "beneficiário": "patient",
        "empresa_patrocinadora": "sponsor_company",
        "quota": "quota_number",
        "valor_alvo": "target_amount",
        "prestacao_mensal": "contribution_amount",
        "prestação_mensal": "contribution_amount",
        "taxa_administrativa": "admin_fee_percent",
        "prazo_meses": "term_months",
        "contemplacao_prevista": "expected_award_date",
        "contemplação_prevista": "expected_award_date",
        "contemplado_em": "awarded_at",
        "servicos_cobertos": "covered_services",
        "serviços_cobertos": "covered_services",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = HealthConsortium
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "sponsor_company_name",
            "invoice_label",
            "expected_total_contribution",
            "admin_fee_amount",
        )


class ElectiveProcedureFinancingSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    invoice_label = serializers.CharField(source="invoice.custom_id", read_only=True)
    financier_company_name = serializers.CharField(source="financier_company.name", read_only=True)
    total_scheduled_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    installment_count = serializers.IntegerField(source="installments.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "empresa_financiadora": "financier_company",
        "procedimento": "procedure_description",
        "contrato": "contract_number",
        "referencia_aprovacao": "approval_reference",
        "referência_aprovação": "approval_reference",
        "risco": "risk_rating",
        "valor_principal": "principal_amount",
        "entrada": "down_payment",
        "valor_financiado": "financed_amount",
        "juro_anual": "annual_interest_rate",
        "prazo_meses": "term_months",
        "parcela": "installment_amount",
        "primeiro_vencimento": "first_due_date",
        "garantias": "collateral_notes",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ElectiveProcedureFinancing
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "financed_amount",
            "installment_amount",
            "patient_name",
            "invoice_label",
            "financier_company_name",
            "total_scheduled_amount",
            "installment_count",
        )


class CreditInstallmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    procedure_financing_label = serializers.CharField(source="procedure_financing.custom_id", read_only=True)
    student_funding_label = serializers.CharField(source="student_funding.custom_id", read_only=True)
    invoice_label = serializers.CharField(source="invoice.custom_id", read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "financiamento_procedimento": "procedure_financing",
        "financiamento_estudantil": "student_funding",
        "pagamento": "payment",
        "numero_parcela": "installment_number",
        "número_parcela": "installment_number",
        "vencimento": "due_date",
        "capital": "principal_amount",
        "juro": "interest_amount",
        "taxas": "fee_amount",
        "total": "total_amount",
        "valor_pago": "paid_amount",
        "pago_em": "paid_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = CreditInstallment
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "total_amount",
            "procedure_financing_label",
            "student_funding_label",
            "invoice_label",
            "balance_due",
        )


class ReimbursementClaimSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    invoice_label = serializers.CharField(source="invoice.custom_id", read_only=True)
    payer_company_name = serializers.CharField(source="payer_company.name", read_only=True)
    balance_to_receive = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "convenio": "payer_company",
        "convênio": "payer_company",
        "seguradora": "payer_company",
        "tipo_pedido": "claim_type",
        "referencia_administrativa": "administrative_reference",
        "referência_administrativa": "administrative_reference",
        "submetido_em": "submitted_at",
        "prazo_resposta": "response_due_date",
        "decisao_em": "decision_at",
        "decisão_em": "decision_at",
        "valor_reclamado": "claimed_amount",
        "valor_aprovado": "approved_amount",
        "valor_glosado": "denied_amount",
        "valor_reembolsado": "reimbursed_amount",
        "motivo_glosa": "glosa_reason",
        "recurso_submetido_em": "appeal_submitted_at",
        "recurso": "appeal_notes",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ReimbursementClaim
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "denied_amount",
            "patient_name",
            "invoice_label",
            "payer_company_name",
            "balance_to_receive",
        )


class StudentFundingSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    student_code = serializers.CharField(source="student.student_code", read_only=True)
    student_name = serializers.CharField(source="student.user.get_full_name", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)
    sponsor_company_name = serializers.CharField(source="sponsor_company.name", read_only=True)
    unfunded_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    installment_count = serializers.IntegerField(source="installments.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "estudante": "student",
        "matricula": "enrollment",
        "matrícula": "enrollment",
        "curso": "course",
        "patrocinador": "sponsor_company",
        "tipo_apoio": "funding_type",
        "ano_academico": "academic_year",
        "ano_académico": "academic_year",
        "referencia_candidatura": "application_reference",
        "referência_candidatura": "application_reference",
        "referencia_aprovacao": "approval_reference",
        "referência_aprovação": "approval_reference",
        "cobertura_percentual": "coverage_percent",
        "propina": "tuition_amount",
        "valor_aprovado": "approved_amount",
        "valor_financiado": "financed_amount",
        "juro_anual": "annual_interest_rate",
        "prazo_meses": "term_months",
        "parcela_mensal": "monthly_installment",
        "fim": "end_date",
        "condicoes": "conditions",
        "condições": "conditions",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = StudentFunding
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "financed_amount",
            "monthly_installment",
            "student_code",
            "student_name",
            "course_name",
            "sponsor_company_name",
            "unfunded_amount",
            "installment_count",
        )


SERIALIZER_MAP = {
    "consortium": HealthConsortiumSerializer,
    "procedure_financing": ElectiveProcedureFinancingSerializer,
    "installment": CreditInstallmentSerializer,
    "reimbursement_claim": ReimbursementClaimSerializer,
    "student_funding": StudentFundingSerializer,
}
