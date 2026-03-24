from api.core.filters import SafeFilterSet
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.account import Account
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement

# =====================================================
# CONTA
# =====================================================


class ContaFilter(SafeFilterSet):
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
# LANÇAMENTO
# =====================================================


class LancamentoFilter(SafeFilterSet):
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
# MOVIMENTO
# =====================================================


class MovimentoFilter(SafeFilterSet):
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
# CONCILIAÇÃO
# =====================================================


class ConciliacaoFinanceiraFilter(SafeFilterSet):
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
    "conta": ContaFilter,
    "conciliacaofinanceira": ConciliacaoFinanceiraFilter,
    "lancamento": LancamentoFilter,
    "movimento": MovimentoFilter,
}
