from api.core.filters import SafeFilterSet
from apps.credit_financing.models import (
    CreditInstallment,
    ElectiveProcedureFinancing,
    HealthConsortium,
    ReimbursementClaim,
    StudentFunding,
)

BASE_FIELDS = [
    "tenant",
    "custom_id",
    "deleted",
    "deleted_at",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class HealthConsortiumFilter(SafeFilterSet):
    class Meta:
        model = HealthConsortium
        fields = [
            *BASE_FIELDS,
            "consortium_type",
            "patient",
            "sponsor_company",
            "invoice",
            "quota_number",
            "status",
            "start_date",
            "expected_award_date",
            "awarded_at",
        ]


class ElectiveProcedureFinancingFilter(SafeFilterSet):
    class Meta:
        model = ElectiveProcedureFinancing
        fields = [
            *BASE_FIELDS,
            "patient",
            "invoice",
            "financier_company",
            "contract_number",
            "approval_reference",
            "status",
            "risk_rating",
            "start_date",
            "first_due_date",
        ]


class CreditInstallmentFilter(SafeFilterSet):
    class Meta:
        model = CreditInstallment
        fields = [
            *BASE_FIELDS,
            "procedure_financing",
            "student_funding",
            "invoice",
            "payment",
            "installment_number",
            "due_date",
            "paid_at",
            "status",
        ]


class ReimbursementClaimFilter(SafeFilterSet):
    class Meta:
        model = ReimbursementClaim
        fields = [
            *BASE_FIELDS,
            "patient",
            "invoice",
            "payer_company",
            "claim_type",
            "status",
            "administrative_reference",
            "submitted_at",
            "response_due_date",
            "decision_at",
            "appeal_submitted_at",
        ]


class StudentFundingFilter(SafeFilterSet):
    class Meta:
        model = StudentFunding
        fields = [
            *BASE_FIELDS,
            "student",
            "enrollment",
            "course",
            "sponsor_company",
            "funding_type",
            "status",
            "academic_year",
            "application_reference",
            "approval_reference",
            "start_date",
            "end_date",
        ]


FILTER_MAP = {
    "consortium": HealthConsortiumFilter,
    "procedure_financing": ElectiveProcedureFinancingFilter,
    "installment": CreditInstallmentFilter,
    "reimbursement_claim": ReimbursementClaimFilter,
    "student_funding": StudentFundingFilter,
}
