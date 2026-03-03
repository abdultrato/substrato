from api.core.filters import SafeFilterSet
from aplicativos.contabilidade.modelos.conciliacao import ConciliacaoFinanceira
from aplicativos.contabilidade.modelos.contas import Conta
from aplicativos.contabilidade.modelos.lancamento import Lancamento
from aplicativos.contabilidade.modelos.movimento import Movimento


# =====================================================
# CONTA
# =====================================================

class ContaFilter(SafeFilterSet) :
	class Meta :
		model = Conta
		fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'tipo', ]


# =====================================================
# LANÇAMENTO
# =====================================================

class LancamentoFilter(SafeFilterSet) :
	class Meta :
		model = Lancamento
		fields = ['inquilino', 'id_custom', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'descricao', 'data', 'referencia_externa', 'confirmado', ]


# =====================================================
# MOVIMENTO
# =====================================================

class MovimentoFilter(SafeFilterSet) :
	class Meta :
		model = Movimento
		fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'lancamento', 'conta', 'debito', 'credito', ]


# =====================================================
# CONCILIAÇÃO
# =====================================================

class ConciliacaoFinanceiraFilter(SafeFilterSet) :
	class Meta :
		model = ConciliacaoFinanceira
		fields = ["fatura", "conciliado", "criado_em", ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {'conta' : ContaFilter, 'conciliacaofinanceira' : ConciliacaoFinanceiraFilter, 'lancamento' : LancamentoFilter, 'movimento' : MovimentoFilter, }