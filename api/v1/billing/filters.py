from api.core.filters import SafeFilterSet
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.billing.models.invoice_history import InvoiceHistory

# =====================================================
# FATURA
# =====================================================


class FaturaFilter(SafeFilterSet):
    class Meta:
        model = Invoice
        fields = [
            "inquilino",
            "id_custom",
            "descricao",
            "ordem",
            "ativo",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "requisicao",
            "cirurgia",
            "paciente",
            "subtotal",
            "iva_valor",
            "total",
            "valor_seguro",
            "valor_paciente",
            "estado",
        ]


# =====================================================
# FATURA ITEM
# =====================================================


class FaturaItemFilter(SafeFilterSet):
    class Meta:
        model = InvoiceItem
        fields = [
            "inquilino",
            "id_custom",
            "ordem",
            "ativo",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "fatura",
            "exame",
            "descricao",
            "quantidade",
            "preco_unitario",
        ]


# =====================================================
# HISTÓRICO FATURA
# =====================================================


class HistoricoFaturaFilter(SafeFilterSet):
    class Meta:
        model = InvoiceHistory
        fields = [
            "fatura",
            "descricao",
            "tipo_evento",
            "criado_em",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "fatura": FaturaFilter,
    "faturaitem": FaturaItemFilter,
    "historicofatura": HistoricoFaturaFilter,
}
