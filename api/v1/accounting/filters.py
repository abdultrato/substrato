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
            "inquilino",
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "ativo",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "tipo",
        ]


# =====================================================
# LEDGER ENTRY
# =====================================================


class LedgerEntryFilter(SafeFilterSet):
    class Meta:
        model = LegacyEntry
        fields = [
            "inquilino",
            "id_custom",
            "nome",
            "ordem",
            "ativo",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "descricao",
            "data",
            "referencia_externa",
            "confirmado",
        ]


# =====================================================
# LEDGER MOVEMENT
# =====================================================


class LedgerMovementFilter(SafeFilterSet):
    class Meta:
        model = LegacyMovement
        fields = [
            "inquilino",
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "ativo",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "lancamento",
            "conta",
            "debito",
            "credito",
        ]


# =====================================================
# RECONCILIATION
# =====================================================


class FinancialReconciliationFilter(SafeFilterSet):
    class Meta:
        model = FinancialReconciliation
        fields = [
            "fatura",
            "conciliado",
            "criado_em",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "conta": AccountFilter,
    "conciliacaofinanceira": FinancialReconciliationFilter,
    "lancamento": LedgerEntryFilter,
    "movimento": LedgerMovementFilter,
}
