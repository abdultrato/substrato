from django.contrib import admin
from django.db.models import Case, F, IntegerField, Min, Sum, When
from django.db.models.functions import Coalesce
from django.utils.html import format_html, format_html_join

from .models.product_category import ProductCategory
from .models.sale_item import SaleItem
from .models.lot import Lot
from .models.inventory_movement import InventoryMovement
from .models.product import Product
from .models.sale import Sale

# =========================================================
# PRODUTO
# =========================================================


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "categoria",
        "preco_venda",
        "iva_percentual",
        "aplica_iva_por_padrao",
        "inventory_total",
        "proximo_vencimento",
        "criado_em",
    )

    search_fields = ("id_custom", "nome")
    list_filter = ("categoria",)
    ordering = ("nome",)
    list_per_page = 50

    readonly_fields = (
        "criado_em",
        "criado_por",
        "atualizado_em",
        "atualizado_por",
        "versao",
        "deletado_em",
        "deletado_por",
    )

    fieldsets = (
        (
            "Informações do Produto",
            {
                "fields": (
                    "nome",
                    "categoria",
                    "preco_venda",
                    "iva_percentual",
                    "aplica_iva_por_padrao",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                ),
            },
        ),
    )

    # =========================
    # QUERY OTIMIZADA
    # =========================

    def get_queryset(self, request):

        qs = super().get_queryset(request)

        qs = qs.annotate(
            quantidade_lotes=Coalesce(
                Sum("lotes__quantidade_inicial"),
                0,
            ),
            movimentos_total=Coalesce(
                Sum(
                    Case(
                        When(
                            lotes__movimentos__tipo="SAI",
                            then=-F("lotes__movimentos__quantidade"),
                        ),
                        default=F("lotes__movimentos__quantidade"),
                        output_field=IntegerField(),
                    )
                ),
                0,
            ),
            proximo_vencimento=Min("lotes__validade"),
        )

        return qs.annotate(inventory_total_calc=F("quantidade_lotes") + F("movimentos_total"))

    # =========================
    # ESTOQUE
    # =========================

    def inventory_total(self, obj):

        inventory = obj.inventory_total_calc or 0

        if inventory <= 5:
            return format_html(
                "<span style='color:red;font-weight:bold'>{}</span>",
                inventory,
            )

        return inventory

    inventory_total.short_description = "Estoque"

    # =========================
    # VENCIMENTO
    # =========================

    def proximo_vencimento(self, obj):

        if not obj.proximo_vencimento:
            return "-"

        return obj.proximo_vencimento

    proximo_vencimento.short_description = "Próximo vencimento"


# =========================================================
# LOTE
# =========================================================


@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "numero_lote",
        "validade",
        "quantidade_inicial",
        "current_balance",
        "vencido_status",
    )

    search_fields = (
        "numero_lote",
        "produto__nome",
    )

    list_filter = (
        "validade",
        "produto",
    )

    ordering = ("validade",)

    list_select_related = ("produto",)

    readonly_fields = (
        "criado_em",
        "criado_por",
        "atualizado_em",
        "atualizado_por",
        "versao",
        "deletado_em",
        "deletado_por",
    )

    fieldsets = (
        (
            "Informações do Lote",
            {
                "fields": (
                    "produto",
                    "numero_lote",
                    "validade",
                    "quantidade_inicial",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                ),
            },
        ),
    )

    list_per_page = 50

    # =========================
    # QUERY OTIMIZADA
    # =========================

    def get_queryset(self, request):

        qs = super().get_queryset(request)

        return qs.annotate(
            saldo_calc=F("quantidade_inicial")
            + Coalesce(
                Sum(
                    Case(
                        When(
                            movimentos__tipo="SAI",
                            then=-F("movimentos__quantidade"),
                        ),
                        default=F("movimentos__quantidade"),
                        output_field=IntegerField(),
                    )
                ),
                0,
            )
        )

    # =========================
    # SALDO
    # =========================

    def current_balance(self, obj):

        saldo = obj.saldo_calc

        if saldo <= 5:
            return format_html("<span style='color:red;font-weight:bold'>{}</span>", saldo)

        return saldo

    current_balance.short_description = "Saldo"
    current_balance.admin_order_field = "saldo_calc"

    # =========================
    # STATUS
    # =========================

    def vencido_status(self, obj):

        if obj.vencido:
            return format_html(
                "<span style='color:{};font-weight:bold'>{}</span>",
                "red",
                "Vencido",
            )

        return format_html(
            "<span style='color:{};font-weight:bold'>{}</span>",
            "green",
            "OK",
        )

    vencido_status.short_description = "Status"


# =========================================================
# MOVIMENTO ESTOQUE
# =========================================================


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = (
        "lote",
        "tipo",
        "origem",
        "item_venda",
        "quantidade",
        "criado_em",
    )

    list_filter = (
        "tipo",
        "origem",
        "criado_em",
    )

    search_fields = (
        "lote__numero_lote",
        "lote__produto__nome",
        "item_venda__venda__numero",
        "item_venda__venda__id_custom",
    )

    list_select_related = (
        "lote",
        "lote__produto",
    )

    ordering = ("-criado_em",)

    readonly_fields = (
        "lote",
        "tipo",
        "origem",
        "item_venda",
        "quantidade",
        "criado_em",
        "criado_por",
        "atualizado_em",
        "atualizado_por",
        "versao",
    )

    fieldsets = (
        (
            "Movimento",
            {
                "fields": (
                    "lote",
                    "tipo",
                    "origem",
                    "item_venda",
                    "quantidade",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )

    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# =========================================================
# ITEM VENDA INLINE
# =========================================================


class ItemVendaInline(admin.TabularInline):
    model = SaleItem
    extra = 0

    autocomplete_fields = ("produto",)

    readonly_fields = ("total_linha_formatado",)

    fields = (
        "produto",
        "quantidade",
        "preco_unitario",
        "total_linha_formatado",
    )

    def total_linha_formatado(self, obj):

        if not obj.pk:
            return "-"

        return f"{obj.total_linha:.2f}"

    total_linha_formatado.short_description = "Total"


# =========================================================
# VENDA
# =========================================================


@admin.register(Sale)
class VendaAdmin(admin.ModelAdmin):
    list_display = (
        "numero",
        "paciente",
        "total",
        "criado_em",
    )

    search_fields = (
        "numero",
        "id_custom",
    )

    list_filter = ("criado_em",)

    ordering = ("-criado_em",)

    list_per_page = 50

    inlines = [ItemVendaInline]

    readonly_fields = (
        "numero",
        "total",
        "criado_em",
        "criado_por",
        "atualizado_em",
        "atualizado_por",
        "versao",
        "deletado_em",
        "deletado_por",
    )

    fieldsets = (
        (
            "Informações da Venda",
            {
                "fields": (
                    "numero",
                    "paciente",
                    "total",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                ),
            },
        ),
    )

    autocomplete_fields = ("paciente",)


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "categoria_pai",
        "category_level",
        "criado_em",
    )

    search_fields = ("nome",)

    list_filter = ("categoria_pai",)

    ordering = ("nome",)

    list_per_page = 50

    list_select_related = ("categoria_pai",)

    readonly_fields = (
        "parent_category_references",
        "criado_em",
        "criado_por",
        "atualizado_em",
        "atualizado_por",
        "versao",
        "deletado_em",
        "deletado_por",
    )

    fieldsets = (
        (
            "Informações da Categoria",
            {
                "fields": (
                    "nome",
                    "descricao",
                    "categoria_pai",
                )
            },
        ),
        (
            "Categorias-pai de Referência",
            {
                "description": "Sugestões para classificação inicial (não salvas automaticamente no banco de dados).",
                "fields": ("parent_category_references",),
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                ),
            },
        ),
    )

    # =====================================
    # NÍVEL DA CATEGORIA
    # =====================================

    def category_level(self, obj):
        return obj.nivel

    category_level.short_description = "Nível"

    def parent_category_references(self, obj):
        itens = format_html_join(
            "",
            "<li>{}</li>",
            ((categoria,) for categoria in ProductCategory.parent_category_references()),
        )
        return format_html("<ul>{}</ul>", itens)

    parent_category_references.short_description = "Categorias sugeridas"


ProdutoAdmin = ProductAdmin
ProductAdmin.estoque_total = ProductAdmin.inventory_total
LoteAdmin = LotAdmin
LotAdmin.saldo_atual = LotAdmin.current_balance
MovimentoEstoqueAdmin = InventoryMovementAdmin
CategoriaProdutoAdmin = ProductCategoryAdmin
ProductCategoryAdmin.nivel_categoria = ProductCategoryAdmin.category_level
ProductCategoryAdmin.categorias_pai_referencia = ProductCategoryAdmin.parent_category_references
