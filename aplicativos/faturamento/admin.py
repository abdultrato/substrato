from django.contrib import admin
from django.contrib import messages
from django.core.exceptions import ValidationError

from .modelos.fatura import Fatura
from .modelos.fatura_itens import FaturaItem


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
    model = FaturaItem
    extra = 0
    autocomplete_fields = (
        "exame",
        "procedimento_item",
        "procedimento_material",
    )
    raw_id_fields = ("item_venda",)
    fields = (
        "tipo_item",
        "exame",
        "item_venda",
        "procedimento_item",
        "procedimento_material",
        "descricao",
        "quantidade",
        "preco_unitario",
        "total_linha",
    )
    readonly_fields = ("total_linha",)

    def total_linha(self, obj):
        if not obj.pk:
            return "-"
        return f"{obj.total:.2f}"

    total_linha.short_description = "Total"


# =====================================================
# FATURA
# =====================================================

@admin.register(Fatura)
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
    )

    list_filter = ("origem", "estado", "deletado", "criado_em")

    autocomplete_fields = ("paciente", "requisicao", "venda", "procedimento")

    readonly_fields = (
        "id_custom",
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

    def referencia_origem(self, obj):
        referencia = obj.referencia_origem
        if not referencia:
            return "-"
        return str(referencia)

    referencia_origem.short_description = "Referência"

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        fatura = form.instance

        if fatura.estado != Fatura.Estado.RASCUNHO:
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
