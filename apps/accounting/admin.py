"""Configuração do Django Admin para o módulo de contabilidade."""

from django.contrib import admin
from django.db.models import Sum

from .models.account import Account
from .models.account_balance import AccountBalance
from .models.financial_reconciliation import FinancialReconciliation
from .models.ledger_entry import LedgerEntry
from .models.ledger_line import LedgerLine
from .models.legacy_entry import LegacyEntry
from .models.legacy_movement import LegacyMovement

# =====================================================
# CONTA (Configuração Estrutural)
# =====================================================


@admin.register(Account)
class ContaAdmin(admin.ModelAdmin):
    """Administra contas (somente leitura para exclusão)."""
    list_display = (
        "custom_id",
        "name",
        "type",
    )

    list_filter = ("type",)

    search_fields = (
        "custom_id",
        "name",
    )

    ordering = ("custom_id",)

    def has_delete_permission(self, request, obj=None):
        return False


# =====================================================
# LEDGER LINE (INLINE READONLY)
# =====================================================


class LedgerLineInline(admin.TabularInline):
    """Exibe linhas contábeis de forma somente leitura dentro de LedgerEntry."""
    model = LedgerLine
    extra = 0
    can_delete = False

    readonly_fields = (
        "account",
        "value",
        "nature",
        "created_at",
    )

    def has_add_permission(self, request, obj=None):
        return False


# =====================================================
# LEDGER ENTRY (Núcleo Contábil Imutável)
# =====================================================


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    """Visualização de lançamentos contábeis imutáveis."""
    list_display = (
        "id",
        "accounting_date",
        "description",
        "external_reference",
        "created_at",
    )

    search_fields = (
        "description",
        "external_reference",
    )

    list_filter = ("accounting_date",)

    ordering = ("-accounting_date",)

    inlines = [LedgerLineInline]

    readonly_fields = (
        "accounting_date",
        "description",
        "external_reference",
        "created_at",
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
class AccountBalanceAdmin(admin.ModelAdmin):
    """Snapshot materializado de saldo por conta (somente leitura)."""
    list_display = (
        "account",
        "current_balance",
        "updated_at",
    )

    search_fields = ("account__custom_id",)

    ordering = ("-updated_at",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# =====================================================
# MOVIMENTO INLINE (Legado - Readonly)
# =====================================================


class LegacyMovementInline(admin.TabularInline):
    """Inline de movimentos legados exibidos em LegacyEntry."""
    model = LegacyMovement
    extra = 0
    can_delete = False

    readonly_fields = (
        "account",
        "debit",
        "credit",
    )

    def has_add_permission(self, request, obj=None):
        return False


# =====================================================
# LANCAMENTO (Legado - Readonly)
# =====================================================


@admin.register(LegacyEntry)
class LegacyEntryAdmin(admin.ModelAdmin):
    """Admin de lançamentos legados com totais agregados."""
    list_display = (
        "id",
        "description",
        "date",
        "confirmed",
        "total_debitos",
        "total_creditos",
    )

    ordering = ("-date",)

    inlines = [LegacyMovementInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)  # Queryset base
        return qs.annotate(
            total_deb=Sum("movimentos__debit"),  # Soma débitos
            total_cred=Sum("movimentos__credit"),  # Soma créditos
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
class LegacyMovementAdmin(admin.ModelAdmin):
    """Admin de movimentos legados standalone (somente leitura)."""
    list_display = (
        "entry",
        "account",
        "debit",
        "credit",
    )

    search_fields = (
        "entry__description",
        "account__custom_id",
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
    """Admin de conciliações financeiras (somente leitura)."""
    list_display = (
        "invoice",
        "accounting_value",
        "received_amount",
        "discrepancy",
        "reconciled",
        "created_at",
    )

    list_filter = (
        "reconciled",
        "created_at",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "invoice",
        "accounting_value",
        "received_amount",
        "discrepancy",
        "reconciled",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
