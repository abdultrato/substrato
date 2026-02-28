from django.contrib import admin
from django.db.models import Sum
from django.utils import timezone
from django.utils.html import format_html

from .modelos.contas import Conta
from .modelos.conciliacao import ConciliacaoFinanceira
from .modelos.lancamento import Lancamento
from .modelos.movimento import Movimento


# =====================================================
# CONTA
# =====================================================


@admin.register(Conta)
class ContaAdmin(admin.ModelAdmin):
    list_display = ("id_custom", "nome")
    search_fields = ("id_custom", "nome")
    ordering = ("id_custom",)


# =====================================================
# MOVIMENTO (INLINE)
# =====================================================


class MovimentoInline(admin.TabularInline):
    model = Movimento
    extra = 2

    def get_extra(self, request, obj=None, **kwargs):
        if obj and obj.confirmado:
            return 0
        return self.extra

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.confirmado:
            return ("conta", "debito", "credito")
        return ()

    def has_add_permission(self, request, obj=None):
        if obj and obj.confirmado:
            return False
        return super().has_add_permission(request, obj)

    def has_change_permission(self, request, obj=None):
        if obj and obj.confirmado:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if obj and obj.confirmado:
            return False
        return super().has_delete_permission(request, obj)


# =====================================================
# LANÇAMENTO
# =====================================================


@admin.register(Lancamento)
class LancamentoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "descricao",
        "data",
        "total_debitos",
        "total_creditos",
        "balanceado",
    )

    search_fields = ("descricao", "referencia_externa")
    list_filter = ("data",)
    ordering = ("-data",)
    inlines = [MovimentoInline]

    # -----------------------------
    # Totais calculados
    # -----------------------------

    def total_debitos(self, obj):
        try:
            total = obj.movimentos.aggregate(total=Sum("debito"))["total"] or 0
            return total
        except Exception:
            return "-"

    def total_creditos(self, obj):
        try:
            total = obj.movimentos.aggregate(total=Sum("credito"))["total"] or 0
            return total
        except Exception:
            return "-"

    def balanceado(self, obj):
        try:
            deb = self.total_debitos(obj)
            cred = self.total_creditos(obj)

            if deb == cred:
                return format_html('<span style="color:{};">{}</span>', "green", "✔")
            return format_html('<span style="color:{};">{}</span>', "red", "✖")
        except Exception:
            return "-"

    balanceado.short_description = "OK"

    def save_model(self, request, obj, form, change):
        if not obj.data:
            obj.data = timezone.localdate()
        super().save_model(request, obj, form, change)


# =====================================================
# MOVIMENTO (Standalone view)
# =====================================================


@admin.register(Movimento)
class MovimentoAdmin(admin.ModelAdmin):
    list_display = ("lancamento", "conta", "debito", "credito")
    search_fields = ("lancamento__descricao", "conta__id_custom")
    list_filter = ("conta",)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "lancamento":
            kwargs["queryset"] = Lancamento.objects.filter(confirmado=False)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ConciliacaoFinanceira)
class ConciliacaoFinanceiraAdmin(admin.ModelAdmin):
    list_display = ("fatura", "valor_registrado", "valor_recebido", "divergencia", "conciliado", "criado_em")
    list_filter = ("conciliado", "criado_em")
    search_fields = ("fatura__id_custom",)
    ordering = ("-criado_em",)
    readonly_fields = ("fatura", "valor_registrado", "valor_recebido", "divergencia", "conciliado", "criado_em")
