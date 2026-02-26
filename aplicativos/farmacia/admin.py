# farmacia/admin.py

from django.contrib import admin
from django.db.models import Sum
from django.utils.html import format_html

from .models.produto import Produto
from .models.lote import Lote
from .models.movimento import MovimentoEstoque
from .models.venda import Venda
from .models.item_venda import ItemVenda


# =========================================================
# PRODUTO
# =========================================================

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):

    list_display = (
        "codigo",
        "nome",
        "tipo",
        "preco_venda",
        "ativo",
        "criado_em",
    )

    search_fields = ("codigo", "nome")
    list_filter = ("tipo", "ativo")
    ordering = ("nome",)

    readonly_fields = ("criado_em", "atualizado_em")

    list_select_related = True
    list_per_page = 50


# =========================================================
# LOTE
# =========================================================

@admin.register(Lote)
class LoteAdmin(admin.ModelAdmin):

    list_display = (
        "produto",
        "numero_lote",
        "validade",
        "saldo_atual",
        "vencido_status",
    )

    search_fields = ("numero_lote", "produto__nome")
    list_filter = ("validade",)
    list_select_related = ("produto",)

    readonly_fields = ("quantidade_inicial", "criado_em")

    def saldo_atual(self, obj):
        return sum(
            m.quantidade_assinada
            for m in obj.movimentoestoque_set.all()
        )
    saldo_atual.short_description = "Saldo"

    def vencido_status(self, obj):
        if obj.vencido:
            return format_html("<span style='color:red;'>Vencido</span>")
        return "OK"


# =========================================================
# MOVIMENTO
# =========================================================

@admin.register(MovimentoEstoque)
class MovimentoEstoqueAdmin(admin.ModelAdmin):

    list_display = (
        "produto",
        "lote",
        "tipo",
        "quantidade",
        "criado_em",
    )

    list_filter = ("tipo", "criado_em")
    search_fields = ("produto__nome", "lote__numero_lote")

    readonly_fields = (
        "produto",
        "lote",
        "tipo",
        "quantidade",
        "criado_em",
    )

    list_select_related = ("produto", "lote")

    def has_add_permission(self, request):
        # Movimentos devem ser feitos via serviço transacional
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# =========================================================
# ITEM VENDA INLINE
# =========================================================

class ItemVendaInline(admin.TabularInline):
    model = ItemVenda
    extra = 0
    readonly_fields = ("total_linha",)
    autocomplete_fields = ("produto",)

    def total_linha(self, obj):
        return obj.total_linha


# =========================================================
# VENDA
# =========================================================

@admin.register(Venda)
class VendaAdmin(admin.ModelAdmin):

    list_display = (
        "numero",
        "total",
        "ativo",
        "criado_em",
    )

    search_fields = ("numero",)
    list_filter = ("ativo", "criado_em")

    inlines = [ItemVendaInline]

    readonly_fields = ("total", "criado_em", "atualizado_em")

    list_per_page = 50

    list_select_related = True
