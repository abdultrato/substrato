import django_filters

from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura

class FaturaFilter(django_filters.FilterSet):
    class Meta:
        model = Fatura
        fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'requisicao', 'paciente', 'subtotal', 'iva_valor', 'total', 'valor_seguro', 'valor_paciente', 'estado']

class FaturaItemFilter(django_filters.FilterSet):
    class Meta:
        model = FaturaItem
        fields = ['inquilino', 'id_custom', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'fatura', 'exame', 'descricao', 'quantidade', 'preco_unitario', 'isento_iva']

class HistoricoFaturaFilter(django_filters.FilterSet):
    class Meta:
        model = HistoricoFatura
        fields = ['fatura', 'descricao', 'tipo_evento', 'criado_em']

FILTER_MAP = {
    'fatura': FaturaFilter,
    'faturaitem': FaturaItemFilter,
    'historicofatura': HistoricoFaturaFilter,
}
