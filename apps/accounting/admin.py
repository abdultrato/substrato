from django.contrib import admin
from django.db.models import Sum

from .models.financial_reconciliation import FinancialReconciliation
from .models.account import Account
from .models.legacy_entry import LegacyEntry
from .models.ledger_entry import LedgerEntry
from .models.ledger_line import LedgerLine
from .models.legacy_movement import LegacyMovement
from .models.account_balance import AccountBalance

# =====================================================
# CONTA (Configuração Estrutural)
# =====================================================


@admin.register(Account)
class ContaAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "tipo",
    )

    list_filter = ("tipo",)

    search_fields = (
        "id_custom",
        "nome",
    )

    ordering = ("id_custom",)

    def has_delete_permission(self, request, obj=None):
        return False


# =====================================================
# LEDGER LINE (INLINE READONLY)
# =====================================================


class LedgerLineInline(admin.TabularInline):
    model = LedgerLine
    extra = 0
    can_delete = False

    readonly_fields = (
        "conta",
        "valor",
        "natureza",
        "criado_em",
    )

    def has_add_permission(self, request, obj=None):
        return False


# =====================================================
# LEDGER ENTRY (Núcleo Contábil Imutável)
# =====================================================


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "data_contabil",
        "descricao",
        "referencia_externa",
        "criado_em",
    )

    search_fields = (
        "descricao",
        "referencia_externa",
    )

    list_filter = ("data_contabil",)

    ordering = ("-data_contabil",)

    inlines = [LedgerLineInline]

    readonly_fields = (
        "data_contabil",
        "descricao",
        "referencia_externa",
        "criado_em",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# =====================================================
# SALDO CONTA (Snapshot Materializado)
# =====================================================


@admin.register(AccountBalance)
class SaldoContaAdmin(admin.ModelAdmin):
    list_display = (
        "conta",
        "saldo_atual",
        "atualizado_em",
    )

    search_fields = ("conta__id_custom",)

    ordering = ("-atualizado_em",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# =====================================================
# MOVIMENTO INLINE (Legado - Readonly)
# =====================================================


class MovimentoInline(admin.TabularInline):
    model = LegacyMovement
    extra = 0
    can_delete = False

    readonly_fields = (
        "conta",
        "debito",
        "credito",
    )

    def has_add_permission(self, request, obj=None):
        return False


# =====================================================
# LANCAMENTO (Legado - Readonly)
# =====================================================


@admin.register(LegacyEntry)
class LancamentoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "descricao",
        "data",
        "confirmado",
        "total_debitos",
        "total_creditos",
    )

    ordering = ("-data",)

    inlines = [MovimentoInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            total_deb=Sum("movimentos__debito"),
            total_cred=Sum("movimentos__credito"),
        )

    def total_debitos(self, obj):
        return obj.total_deb or 0

    def total_creditos(self, obj):
        return obj.total_cred or 0

    total_debitos.short_description = "Débitos"
    total_creditos.short_description = "Créditos"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# =====================================================
# MOVIMENTO (Standalone - Readonly)
# =====================================================


@admin.register(LegacyMovement)
class MovimentoAdmin(admin.ModelAdmin):
    list_display = (
        "lancamento",
        "conta",
        "debito",
        "credito",
    )

    search_fields = (
        "lancamento__descricao",
        "conta__id_custom",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# =====================================================
# CONCILIAÇÃO FINANCEIRA (Auditoria)
# =====================================================


@admin.register(FinancialReconciliation)
class ConciliacaoFinanceiraAdmin(admin.ModelAdmin):
    list_display = (
        "fatura",
        "valor_contabil",
        "valor_recebido",
        "divergencia",
        "conciliado",
        "criado_em",
    )

    list_filter = (
        "conciliado",
        "criado_em",
    )

    ordering = ("-criado_em",)

    readonly_fields = (
        "fatura",
        "valor_contabil",
        "valor_recebido",
        "divergencia",
        "conciliado",
        "criado_em",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
