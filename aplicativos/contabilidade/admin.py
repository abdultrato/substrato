from django.contrib import admin
from django.db.models import Sum
from django.utils.html import format_html

from .modelos.contas import Conta
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
    extra = 0
    readonly_fields = ("conta", "debito", "credito")
    can_delete = False


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

    readonly_fields = ("data",)

    # -----------------------------
    # Totais calculados
    # -----------------------------

    def total_debitos(self, obj):
        total = obj.movimentos.aggregate(total=Sum("debito"))["total"] or 0
        return total

    def total_creditos(self, obj):
        total = obj.movimentos.aggregate(total=Sum("credito"))["total"] or 0
        return total

    def balanceado(self, obj):
        deb = self.total_debitos(obj)
        cred = self.total_creditos(obj)

        if deb == cred:
            return format_html('<span style="color:green;">✔</span>')
        return format_html('<span style="color:red;">✖</span>')

    balanceado.short_description = "OK"


# =====================================================
# MOVIMENTO (Standalone view)
# =====================================================


@admin.register(Movimento)
class MovimentoAdmin(admin.ModelAdmin):
    list_display = ("lancamento", "conta", "debito", "credito")
    search_fields = ("lancamento__descricao", "conta__codigo")
    list_filter = ("conta",)
