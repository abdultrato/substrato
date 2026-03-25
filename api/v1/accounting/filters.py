from api.core.filters import SafeFilterSet
from apps.accounting.models.account import Account
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement

# =====================================================
# ACCOUNT
# =====================================================


class AccountFilter(SafeFilterSet):
    class Meta:
        model = Account
        fields = [
            "tenant",
            "custom_id",
            "description",
            "name",
            "order",
            "active",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "type",
        ]


# =====================================================
# LEDGER ENTRY
# =====================================================


class LedgerEntryFilter(SafeFilterSet):
    class Meta:
        model = LegacyEntry
        fields = [
            "tenant",
            "custom_id",
            "name",
            "order",
            "active",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "description",
            "date",
            "external_reference",
            "confirmed",
        ]


# =====================================================
# LEDGER MOVEMENT
# =====================================================


class LedgerMovementFilter(SafeFilterSet):
    class Meta:
        model = LegacyMovement
        fields = [
            "tenant",
            "custom_id",
            "description",
            "name",
            "order",
            "active",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "entry",
            "account",
            "debit",
            "credit",
        ]


# =====================================================
# RECONCILIATION
# =====================================================


class FinancialReconciliationFilter(SafeFilterSet):
    class Meta:
        model = FinancialReconciliation
        fields = [
            "invoice",
            "reconciled",
            "created_at",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "account": AccountFilter,
    "conciliacaofinanceira": FinancialReconciliationFilter,
    "entry": LedgerEntryFilter,
    "movimento": LedgerMovementFilter,
}
