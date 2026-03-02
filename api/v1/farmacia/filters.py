import django_filters

from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.movimento import MovimentoEstoque
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.venda import Venda


class ItemVendaFilter(django_filters.FilterSet) :
	class Meta :
		model = ItemVenda
		fields = [
				'inquilino', 'id_custom', 'descricao', 'nome', 'ordem',
				'ativo',
				'deletado', 'deletado_em', 'criado_em', 'atualizado_em',
				'criado_por', 'atualizado_por', 'venda', 'produto',
				'quantidade', 'preco_unitario',
				]


class LoteFilter(django_filters.FilterSet) :
	class Meta :
		model = Lote
		fields = [
				'inquilino', 'id_custom', 'descricao', 'nome', 'ordem',
				'ativo',
				'deletado', 'deletado_em', 'criado_em', 'atualizado_em',
				'criado_por', 'atualizado_por', 'produto', 'numero_lote',
				'validade', 'quantidade_inicial',
				]


class MovimentoEstoqueFilter(django_filters.FilterSet) :
	class Meta :
		model = MovimentoEstoque
		fields = [
				'inquilino', 'id_custom', 'descricao', 'nome', 'ordem',
				'ativo',
				'deletado', 'deletado_em', 'criado_em', 'atualizado_em',
				'criado_por', 'atualizado_por', 'lote', 'tipo',
				'quantidade',
				]


class ProdutoFilter(django_filters.FilterSet) :
	class Meta :
		model = Produto
		fields = [
				'inquilino', 'id_custom', 'descricao', 'nome', 'ordem',
				'ativo',
				'deletado', 'deletado_em', 'criado_em', 'atualizado_em',
				'criado_por', 'atualizado_por', 'tipo', 'preco_venda',
				]


class VendaFilter(django_filters.FilterSet) :
	class Meta :
		model = Venda
		fields = [
				'inquilino', 'id_custom', 'descricao', 'nome', 'ordem',
				'ativo',
				'deletado', 'deletado_em', 'criado_em', 'atualizado_em',
				'criado_por', 'atualizado_por', 'numero', 'total',
				]


FILTER_MAP = {
		'itemvenda'        : ItemVendaFilter,
		'lote'             : LoteFilter,
		'movimentoestoque' : MovimentoEstoqueFilter,
		'venda'            : VendaFilter,
		}
