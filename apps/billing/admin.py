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
# FATURA ITEM INLINE POR TIPO
# =====================================================


class BaseTypedInvoiceItemInline(admin.TabularInline):
    """
    Inline especializado por tipo de item.
    Subclasses devem definir:
      - item_type_fixed (InvoiceItem.ItemType)
      - fields relevantes para o tipo
    """

    model = InvoiceItem
    extra = 1
    readonly_fields = ("description", "unit_price", "vat_percentage", "iva_linha", "total_linha")

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        fixed_type = self.item_type_fixed

        # Dynamically set the fixed item_type on each form instance before validation.
        base_form = formset.form

        class FixedTypeForm(base_form):
            def __init__(self, *args, **kw):
                super().__init__(*args, **kw)
                self.instance.item_type = fixed_type

        formset.form = FixedTypeForm
        return formset

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(item_type=self.item_type_fixed)

    def save_new(self, form, commit=True):
        obj = super().save_new(form, commit=False)
        obj.item_type = self.item_type_fixed
        if commit:
            obj.save()
            form.save_m2m()
        return obj

    # Helpers iguais aos do inline original
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


class InvoiceLabItemInline(BaseTypedInvoiceItemInline):
    item_type_fixed = InvoiceItem.ItemType.EXAME
    verbose_name = "Exame laboratorial"
    verbose_name_plural = "Exames laboratoriais"
    autocomplete_fields = ("exam",)
    fields = (
        "exam",
        "description",
        "quantity",
        "unit_price",
        "applies_vat",
        "vat_percentage",
        "iva_linha",
        "total_linha",
    )


class InvoiceMedicalExamItemInline(BaseTypedInvoiceItemInline):
    item_type_fixed = InvoiceItem.ItemType.EXAME_MEDICO
    verbose_name = "Exame médico"
    verbose_name_plural = "Exames médicos"
    autocomplete_fields = ("medical_exam",)
    fields = (
        "medical_exam",
        "description",
        "quantity",
        "unit_price",
        "applies_vat",
        "vat_percentage",
        "iva_linha",
        "total_linha",
    )


class InvoiceConsultationItemInline(BaseTypedInvoiceItemInline):
    item_type_fixed = InvoiceItem.ItemType.CONSULTATION
    verbose_name = "Consulta médica"
    verbose_name_plural = "Consultas médicas"
    autocomplete_fields = ("consultation",)
    fields = (
        "consultation",
        "description",
        "quantity",
        "unit_price",
        "applies_vat",
        "vat_percentage",
        "iva_linha",
        "total_linha",
    )


class InvoicePharmacyItemInline(BaseTypedInvoiceItemInline):
    item_type_fixed = InvoiceItem.ItemType.ITEM_VENDA
    verbose_name = "Item de farmácia"
    verbose_name_plural = "Itens de farmácia"
    autocomplete_fields = ("product",)
    raw_id_fields = ()
    fields = (
        "product",
        "description",
        "quantity",
        "unit_price",
        "applies_vat",
        "vat_percentage",
        "iva_linha",
        "total_linha",
    )


class InvoiceProcedureItemInline(BaseTypedInvoiceItemInline):
    item_type_fixed = InvoiceItem.ItemType.PROCEDIMENTO_ITEM
    verbose_name = "Procedimento de enfermagem"
    verbose_name_plural = "Procedimentos de enfermagem"
    autocomplete_fields = ("procedure_item",)
    fields = (
        "procedure_item",
        "description",
        "quantity",
        "unit_price",
        "applies_vat",
        "vat_percentage",
        "iva_linha",
        "total_linha",
    )


class InvoiceProcedureMaterialInline(BaseTypedInvoiceItemInline):
    item_type_fixed = InvoiceItem.ItemType.PROCEDIMENTO_MATERIAL
    verbose_name = "Material de enfermagem"
    verbose_name_plural = "Materiais de enfermagem"
    autocomplete_fields = ("procedure_material",)
    fields = (
        "procedure_material",
        "description",
        "quantity",
        "unit_price",
        "applies_vat",
        "vat_percentage",
        "iva_linha",
        "total_linha",
    )


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
                    "patient",
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

    inlines = [
        InvoiceLabItemInline,
        InvoiceMedicalExamItemInline,
        InvoiceConsultationItemInline,
        InvoicePharmacyItemInline,
        InvoiceProcedureItemInline,
        InvoiceProcedureMaterialInline,
    ]
    actions = ("sync_origin_items",)
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

        if invoice.status != Invoice.Status.DRAFT:
            return

        if invoice.items.filter(deleted=False).exists():
            return

        try:
            invoice.sync_items_from_origin()
        except ValidationError as exc:
            messages.error(request, str(exc))

    @admin.action(description="Sincronizar itens com base na origin")
    def sync_origin_items(self, request, queryset):
        processadas = 0
        erros = 0

        for invoice in queryset:
            try:
                invoice.sync_items_from_origin()
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
