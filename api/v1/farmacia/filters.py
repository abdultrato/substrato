from api.core.filters import SafeFilterSet

from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.movimento import MovimentoEstoque
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.venda import Venda


# =====================================================
# ITEM VENDA
# =====================================================

class ItemVendaFilter(SafeFilterSet) :
	class Meta :
		model = ItemVenda
		fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'venda', 'produto', 'quantidade', 'preco_unitario', ]


# =====================================================
# LOTE
# =====================================================

class LoteFilter(SafeFilterSet) :
	class Meta :
		model = Lote
		fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'produto', 'numero_lote', 'validade', 'quantidade_inicial', ]


# =====================================================
# MOVIMENTO ESTOQUE
# =====================================================

class MovimentoEstoqueFilter(SafeFilterSet) :
	class Meta :
		model = MovimentoEstoque
		fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'lote', 'tipo', 'origem', 'item_venda', 'quantidade', ]


# =====================================================
# PRODUTO
# =====================================================

class ProdutoFilter(SafeFilterSet) :
	class Meta :
		model = Produto
		fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'tipo', 'preco_venda', ]


# =====================================================
# VENDA
# =====================================================

class VendaFilter(SafeFilterSet) :
	class Meta :
		model = Venda
		fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'numero', 'total', ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {'itemvenda' : ItemVendaFilter, 'lote' : LoteFilter, 'movimentoestoque' : MovimentoEstoqueFilter, 'produto' : ProdutoFilter, 'venda' : VendaFilter, }
