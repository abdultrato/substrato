from django.contrib import admin

from .models import (
    CreditInstallment,
    ElectiveProcedureFinancing,
    HealthConsortium,
    ReimbursementClaim,
    StudentFunding,
)


class CreditInstallmentInline(admin.TabularInline):
    model = CreditInstallment
    extra = 0
    fields = ("installment_number", "due_date", "principal_amount", "interest_amount", "total_amount", "paid_amount", "status")
    readonly_fields = ("total_amount",)
    ordering = ("installment_number",)


@admin.register(HealthConsortium)
class HealthConsortiumAdmin(admin.ModelAdmin):
    list_display = ("name", "consortium_type", "patient", "sponsor_company", "target_amount", "contribution_amount", "status", "start_date")
    list_filter = ("consortium_type", "status", "start_date", "deleted")
    search_fields = ("name", "custom_id", "quota_number", "patient__name", "sponsor_company__name", "covered_services")
    autocomplete_fields = ("patient", "sponsor_company", "invoice")
    ordering = ("-start_date",)


@admin.register(ElectiveProcedureFinancing)
class ElectiveProcedureFinancingAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "procedure_description", "principal_amount", "financed_amount", "installment_amount", "status", "risk_rating")
    list_filter = ("status", "risk_rating", "start_date", "deleted")
    search_fields = ("custom_id", "contract_number", "approval_reference", "patient__name", "procedure_description")
    autocomplete_fields = ("patient", "invoice", "financier_company")
    readonly_fields = ("financed_amount", "installment_amount")
    inlines = (CreditInstallmentInline,)
    ordering = ("-start_date",)


@admin.register(CreditInstallment)
class CreditInstallmentAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "procedure_financing", "student_funding", "installment_number", "due_date", "total_amount", "paid_amount", "status")
    list_filter = ("status", "due_date", "deleted")
    search_fields = ("custom_id", "procedure_financing__custom_id", "student_funding__custom_id", "notes")
    autocomplete_fields = ("procedure_financing", "student_funding", "invoice")
    raw_id_fields = ("payment",)
    readonly_fields = ("total_amount",)
    ordering = ("due_date", "installment_number")


@admin.register(ReimbursementClaim)
class ReimbursementClaimAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "claim_type", "payer_company", "patient", "claimed_amount", "approved_amount", "denied_amount", "status", "submitted_at")
    list_filter = ("claim_type", "status", "submitted_at", "deleted")
    search_fields = ("custom_id", "administrative_reference", "payer_company__name", "patient__name", "glosa_reason", "appeal_notes")
    autocomplete_fields = ("patient", "invoice", "payer_company")
    readonly_fields = ("denied_amount",)
    ordering = ("-submitted_at",)


@admin.register(StudentFunding)
class StudentFundingAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "student", "funding_type", "academic_year", "tuition_amount", "approved_amount", "monthly_installment", "status")
    list_filter = ("funding_type", "status", "academic_year", "deleted")
    search_fields = ("custom_id", "application_reference", "approval_reference", "student__student_code", "student__user__username", "conditions")
    autocomplete_fields = ("student", "enrollment", "course", "sponsor_company")
    readonly_fields = ("monthly_installment",)
    ordering = ("-start_date",)
