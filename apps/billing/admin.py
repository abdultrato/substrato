from django.contrib import admin, messages
from django.core.exceptions import ValidationError

from .models.invoice import Invoice
from .models.invoice_items import InvoiceItem

# =====================================================
# BASE ADMIN
# =====================================================


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


# =====================================================
# FATURA ITEM INLINE
# =====================================================


class FaturaItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    autocomplete_fields = (
        "exame",
        "exame_medico",
        "procedimento_item",
        "procedimento_material",
    )
    raw_id_fields = ("item_venda",)
    fields = (
        "tipo_item",
        "exame",
        "exame_medico",
        "item_venda",
        "procedimento_item",
        "procedimento_material",
        "descricao",
        "quantidade",
        "preco_unitario",
        "aplica_iva",
        "iva_percentual",
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
            return f"{obj.iva_valor:.2f}"
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
class FaturaAdmin(CoreAdmin):
    list_display = (
        "id_custom",
        "origem",
        "referencia_origem",
        "paciente",
        "total",
        "estado",
        "criado_em",
    )

    search_fields = (
        "id_custom",
        "paciente__nome",
        "requisicao__id_custom",
        "requisicao__paciente__nome",
        "venda__numero",
        "venda__id_custom",
        "procedimento__id_custom",
        "procedimento__paciente__nome",
        "procedimentos__id_custom",
        "procedimentos__paciente__nome",
        "consulta__id_custom",
        "consulta__paciente__nome",
        "cirurgia__id_custom",
        "cirurgia__paciente__nome",
    )

    list_filter = ("origem", "estado", "deletado", "criado_em")

    autocomplete_fields = ("requisicao", "venda", "procedimento", "procedimentos", "consulta", "cirurgia")

    readonly_fields = (
        "id_custom",
        "paciente",
        "subtotal",
        "iva_valor",
        "total",
        "valor_paciente",
        "criado_em",
        "atualizado_em",
    )

    fieldsets = (
        (
            "Fatura",
            {
                "fields": (
                    "id_custom",
                    "origem",
                    "requisicao",
                    "venda",
                    "procedimento",
                    "procedimentos",
                    "consulta",
                    "paciente",
                    "valor_seguro",
                    "subtotal",
                    "iva_valor",
                    "total",
                    "valor_paciente",
                    "estado",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                ),
            },
        ),
    )

    inlines = [FaturaItemInline]
    actions = ("sincronizar_itens_origem",)
    filter_horizontal = ("procedimentos",)

    def referencia_origem(self, obj):
        referencia = obj.referencia_origem
        if not referencia:
            return "-"
        return str(referencia)

    referencia_origem.short_description = "Referência"

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        fatura = form.instance

        if fatura.estado != Invoice.Estado.RASCUNHO:
            return

        if fatura.itens.filter(deletado=False).exists():
            return

        try:
            fatura.sincronizar_itens_da_origem()
        except ValidationError as exc:
            messages.error(request, str(exc))

    @admin.action(description="Sincronizar itens com base na origem")
    def sincronizar_itens_origem(self, request, queryset):
        processadas = 0
        erros = 0

        for fatura in queryset:
            try:
                fatura.sincronizar_itens_da_origem()
                processadas += 1
            except ValidationError as exc:
                erros += 1
                messages.error(request, f"{fatura.id_custom}: {exc}")

        if processadas:
            messages.success(
                request,
                f"{processadas} fatura(s) sincronizada(s) com sucesso.",
            )
        if erros and not processadas:
            messages.warning(
                request,
                "Nenhuma fatura foi sincronizada devido a erros de validação.",
            )
