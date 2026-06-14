"""Configuração do Django Admin para pagamentos."""

from django.contrib import admin

from apps.payments.models.payment import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Registo standalone de pagamento.

    Necessário para suportar ``autocomplete_fields`` que referenciam ``Payment``
    a partir de outros apps (ex.: ``apps.dental.admin.DentalPaymentAdmin``).
    """

    list_display = ("custom_id", "invoice", "method", "status", "value", "paid_at")
    list_filter = ("method", "status", "deleted")
    search_fields = ("custom_id", "external_reference", "authorization_number")
    raw_id_fields = ("invoice", "insurer", "coverage_plan")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
