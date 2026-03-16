from api.core.filters import SafeFilterSet
from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.pagamentos.modelos.reconciliacao import Reconciliacao
from aplicativos.pagamentos.modelos.transacao import Transacao

# =====================================================
# PAGAMENTO
# =====================================================


class PagamentoFilter(SafeFilterSet):
    class Meta:
        model = Pagamento
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
            "pago_em",
        ]


# =====================================================
# RECIBO
# =====================================================


class ReciboFilter(SafeFilterSet):
    class Meta:
        model = Recibo
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
        model = Reconciliacao
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
        model = Transacao
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
