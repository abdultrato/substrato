from api.core.filters import SafeFilterSet

from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura


# =====================================================
# FATURA
# =====================================================

class FaturaFilter(SafeFilterSet) :
	class Meta :
		model = Fatura
		fields = ['inquilino', 'id_custom', 'descricao', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'requisicao', 'paciente', 'subtotal', 'iva_valor', 'total', 'valor_seguro', 'valor_paciente', 'estado', ]


# =====================================================
# FATURA ITEM
# =====================================================

class FaturaItemFilter(SafeFilterSet) :
	class Meta :
		model = FaturaItem
		fields = ['inquilino', 'id_custom', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'fatura', 'exame', 'descricao', 'quantidade', 'preco_unitario', ]


# =====================================================
# HISTÓRICO FATURA
# =====================================================

class HistoricoFaturaFilter(SafeFilterSet) :
	class Meta :
		model = HistoricoFatura
		fields = ['fatura', 'descricao', 'tipo_evento', 'criado_em', ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {'fatura' : FaturaFilter, 'faturaitem' : FaturaItemFilter, 'historicofatura' : HistoricoFaturaFilter, }