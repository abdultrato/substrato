from django.contrib import admin, messages
from django.core.exceptions import ValidationError

from .models.invoice import Invoice
from .models.invoice_items import InvoiceItem

# =====================================================
# BASE ADMIN
# =====================================================


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


# =====================================================
# FATURA ITEM INLINE
# =====================================================


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    autocomplete_fields = (
        "exam",
        "medical_exam",
        "procedure_item",
        "procedure_material",
    )
    raw_id_fields = ("sale_item",)
    fields = (
        "item_type",
        "exam",
        "medical_exam",
        "sale_item",
        "procedure_item",
        "procedure_material",
        "description",
        "quantity",
        "unit_price",
        "applies_vat",
        "vat_percentage",
        "iva_linha",
        "total_linha",
    )
    readonly_fields = (
        "iva_linha",
        "total_linha",
    )

    def iva_linha(self, obj):
        if not obj.pk:
            return "-"
        try:
            return f"{obj.vat_amount:.2f}"
        except Exception:
            return "-"

    iva_linha.short_description = "IVA"

    def total_linha(self, obj):
        if not obj.pk:
            return "-"
        try:
            return f"{obj.total_com_iva:.2f}"
        except Exception:
            return f"{obj.total:.2f}"

    total_linha.short_description = "Total (com IVA)"


# =====================================================
# FATURA
# =====================================================


@admin.register(Invoice)
class InvoiceAdmin(CoreAdmin):
    list_display = (
        "custom_id",
        "origin",
        "source_reference",
        "patient",
        "total",
        "status",
        "created_at",
    )

    search_fields = (
        "custom_id",
        "patient__name",
        "request__custom_id",
        "request__patient__name",
        "sale__number",
        "sale__custom_id",
        "procedure__custom_id",
        "procedure__patient__name",
        "procedures__custom_id",
        "procedures__patient__name",
        "consultation__custom_id",
        "consultation__patient__name",
        "surgery__custom_id",
        "surgery__patient__name",
    )

    list_filter = ("origin", "status", "deleted", "created_at")

    autocomplete_fields = ("request", "sale", "procedure", "procedures", "consultation", "surgery")

    readonly_fields = (
        "custom_id",
        "patient",
        "subtotal",
        "vat_amount",
        "total",
        "patient_amount",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Fatura",
            {
                "fields": (
                    "custom_id",
                    "origin",
                    "request",
                    "sale",
                    "procedure",
                    "procedures",
                    "consultation",
                    "patient",
                    "insurance_amount",
                    "subtotal",
                    "vat_amount",
                    "total",
                    "patient_amount",
                    "status",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    inlines = [InvoiceItemInline]
    actions = ("sincronizar_itens_origin",)
    filter_horizontal = ("procedures",)

    def source_reference(self, obj):
        source_reference = obj.source_reference
        if not source_reference:
            return "-"
        return str(source_reference)

    source_reference.short_description = "Referência"

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        invoice = form.instance

        if invoice.status != Invoice.Estado.RASCUNHO:
            return

        if invoice.itens.filter(deleted=False).exists():
            return

        try:
            invoice.sincronizar_itens_da_origin()
        except ValidationError as exc:
            messages.error(request, str(exc))

    @admin.action(description="Sincronizar itens com base na origin")
    def sincronizar_itens_origin(self, request, queryset):
        processadas = 0
        erros = 0

        for invoice in queryset:
            try:
                invoice.sincronizar_itens_da_origin()
                processadas += 1
            except ValidationError as exc:
                erros += 1
                messages.error(request, f"{invoice.custom_id}: {exc}")

        if processadas:
            messages.success(
                request,
                f"{processadas} invoice(s) sincronizada(s) com sucesso.",
            )
        if erros and not processadas:
            messages.warning(
                request,
                "Nenhuma invoice foi sincronizada devido a erros de validação.",
            )
