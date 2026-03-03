from django.contrib import admin
from django.db.models import Case, F, IntegerField, Sum, When
from django.utils.html import format_html

from aplicativos.farmacia.models.movimento import TipoMovimento
from .models.item_venda import ItemVenda
from .models.lote import Lote
from .models.movimento import MovimentoEstoque
from .models.produto import Produto
from .models.venda import Venda


# =========================================================
# PRODUTO
# =========================================================

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin) :
	list_display = ("id_custom", "nome", "tipo", "preco_venda", "criado_em",)
	
	search_fields = ("id_custom", "nome")
	list_filter = ("tipo",)
	ordering = ("nome",)
	
	readonly_fields = ("criado_em", "atualizado_em")
	
	list_select_related = True
	list_per_page = 50


# =========================================================
# LOTE
# =========================================================

@admin.register(Lote)
class LoteAdmin(admin.ModelAdmin) :
	list_display = ("produto", "numero_lote", "validade", "saldo_atual", "vencido_status",)
	
	search_fields = ("numero_lote", "produto__nome")
	list_filter = ("validade",)
	list_select_related = ("produto",)
	
	readonly_fields = ("criado_em",)
	
	# =====================================================
	# QUERY OTIMIZADA
	# =====================================================
	
	def get_queryset(self, request) :
		qs = super().get_queryset(request)
		
		return qs.annotate(_saldo = Sum(Case(When(movimentoestoque__tipo = TipoMovimento.SAIDA, then = -F("movimentoestoque__quantidade"), ), default = F("movimentoestoque__quantidade"), output_field = IntegerField(), )))
	
	# =====================================================
	# SALDO
	# =====================================================
	
	def saldo_atual(self, obj) :
		return obj._saldo or 0
	
	saldo_atual.short_description = "Saldo"
	saldo_atual.admin_order_field = "_saldo"
	
	# =====================================================
	# STATUS
	# =====================================================
	
	def vencido_status(self, obj) :
		if getattr(obj, "vencido", False) :
			return format_html("<span style='color:red;'>Vencido</span>")
		return "OK"


# =========================================================
# MOVIMENTO
# =========================================================

@admin.register(MovimentoEstoque)
class MovimentoEstoqueAdmin(admin.ModelAdmin) :
	list_display = ("lote", "tipo", "quantidade", "criado_em",)
	
	list_filter = ("tipo", "criado_em")
	
	readonly_fields = ("lote", "tipo", "quantidade", "criado_em",)
	
	def has_add_permission(self, request) :
		return False
	
	def has_delete_permission(self, request, obj = None) :
		return False


# =========================================================
# ITEM VENDA INLINE
# =========================================================

class ItemVendaInline(admin.TabularInline) :
	model = ItemVenda
	extra = 0
	readonly_fields = ("total_linha",)
	autocomplete_fields = ("produto",)
	
	def total_linha(self, obj) :
		try :
			return obj.total_linha
		except Exception :
			return "-"


# =========================================================
# VENDA
# =========================================================

@admin.register(Venda)
class VendaAdmin(admin.ModelAdmin) :
	list_display = ("numero", "total", "criado_em",)
	
	search_fields = ("numero",)
	list_filter = ("criado_em",)
	
	inlines = [ItemVendaInline]
	
	readonly_fields = ("total", "criado_em", "atualizado_em")
	
	list_per_page = 50
	list_select_related = True