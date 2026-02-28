import django_filters

from aplicativos.contabilidade.modelos.contas import Conta
from aplicativos.contabilidade.modelos.conciliacao import ConciliacaoFinanceira
from aplicativos.contabilidade.modelos.lancamento import Lancamento
from aplicativos.contabilidade.modelos.movimento import Movimento

class ContaFilter(django_filters.FilterSet):
    class Meta:
        model = Conta
        fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'tipo']

class LancamentoFilter(django_filters.FilterSet):
    class Meta:
        model = Lancamento
        fields = ['inquilino', 'id_custom', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'descricao', 'data', 'referencia_externa', 'confirmado']

class MovimentoFilter(django_filters.FilterSet):
    class Meta:
        model = Movimento
        fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'lancamento', 'conta', 'debito', 'credito']

class ConciliacaoFinanceiraFilter(django_filters.FilterSet):
    class Meta:
        model = ConciliacaoFinanceira
        fields = ["fatura", "conciliado", "criado_em"]

FILTER_MAP = {
    'conta': ContaFilter,
    'conciliacaofinanceira': ConciliacaoFinanceiraFilter,
    'lancamento': LancamentoFilter,
    'movimento': MovimentoFilter,
}
