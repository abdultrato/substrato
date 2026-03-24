from api.core.filters import SafeFilterSet
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction

# =====================================================
# PAGAMENTO
# =====================================================


class PagamentoFilter(SafeFilterSet):
    class Meta:
        model = Payment
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
            "fatura",
            "valor",
            "metodo",
            "status",
            "referencia_externa",
            "seguradora",
            "plano_cobertura",
            "numero_autorizacao",
            "pago_em",
        ]


# =====================================================
# RECIBO
# =====================================================


class ReciboFilter(SafeFilterSet):
    class Meta:
        model = Receipt
        fields = [
            "fatura",
            "pagamento",
            "numero",
            "valor",
            "criado_em",
        ]


# =====================================================
# RECONCILIAÇÃO
# =====================================================


class ReconciliacaoFilter(SafeFilterSet):
    class Meta:
        model = Reconciliation
        fields = [
            "transacao",
            "confirmado",
            "data_confirmacao",
            "criado_em",
        ]


# =====================================================
# TRANSAÇÃO
# =====================================================


class TransacaoFilter(SafeFilterSet):
    class Meta:
        model = Transaction
        fields = [
            "referencia_externa",
            "gateway",
            "status",
            "criado_em",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "pagamento": PagamentoFilter,
    "recibo": ReciboFilter,
    "reconciliacao": ReconciliacaoFilter,
    "transacao": TransacaoFilter,
}
