from django.contrib import admin

from apps.cotacoes.models import (
    ProformaHistory,
    ProformaInvoice,
    ProformaItem,
    Quotation,
    QuotationItem,
    QuotationStatusHistory,
)


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 0
    fields = ("item_type", "description", "quantity", "unit_price", "discount_rate", "tax_rate", "line_total")
    readonly_fields = ("line_total",)


class QuotationStatusHistoryInline(admin.TabularInline):
    model = QuotationStatusHistory
    extra = 0
    fields = ("event_at", "event_type", "from_status", "to_status", "actor_name", "summary")
    readonly_fields = fields
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ("quotation_number", "fiscal_client_name", "status", "issue_date", "expiry_date", "grand_total")
    list_filter = ("status", "deposit_type", "currency")
    search_fields = ("quotation_number", "custom_id", "fiscal_client_name", "fiscal_client_nuit")
    readonly_fields = (
        "quotation_number",
        "subtotal",
        "discount_total",
        "tax_total",
        "grand_total",
        "deposit_required",
        "balance_due",
        "converted_proforma",
    )
    inlines = [QuotationItemInline, QuotationStatusHistoryInline]


@admin.register(QuotationItem)
class QuotationItemAdmin(admin.ModelAdmin):
    list_display = ("quotation", "description", "quantity", "unit_price", "line_total")
    search_fields = ("description",)


class ProformaItemInline(admin.TabularInline):
    model = ProformaItem
    extra = 0
    fields = ("item_type", "description", "quantity", "unit_price", "discount_rate", "tax_rate", "line_total")
    readonly_fields = ("line_total",)


class ProformaHistoryInline(admin.TabularInline):
    model = ProformaHistory
    extra = 0
    fields = ("event_at", "event_type", "from_status", "to_status", "actor_name", "summary")
    readonly_fields = fields
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ProformaInvoice)
class ProformaInvoiceAdmin(admin.ModelAdmin):
    list_display = ("proforma_number", "fiscal_client_name", "status", "issue_date", "expiry_date", "grand_total")
    list_filter = ("status", "deposit_type", "currency")
    search_fields = ("proforma_number", "custom_id", "fiscal_client_name", "fiscal_client_nuit")
    readonly_fields = (
        "proforma_number",
        "quotation",
        "subtotal",
        "discount_total",
        "tax_total",
        "grand_total",
        "deposit_required",
        "balance_due",
        "converted_invoice",
    )
    inlines = [ProformaItemInline, ProformaHistoryInline]
