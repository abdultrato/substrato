from django.contrib import admin
from django.db.models import Case, F, IntegerField, Min, Sum, When
from django.db.models.functions import Coalesce
from django.utils.html import format_html, format_html_join

from .models.categoria_produto import CategoriaProduto
from .models.item_venda import ItemVenda
from .models.lote import Lote
from .models.movimento import MovimentoEstoque
from .models.produto import Produto
from .models.venda import Venda

# =========================================================
# PRODUTO
# =========================================================


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "categoria",
        "preco_venda",
        "iva_percentual",
        "estoque_total",
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

        return qs.annotate(estoque_total_calc=F("quantidade_lotes") + F("movimentos_total"))

    # =========================
    # ESTOQUE
    # =========================

    def estoque_total(self, obj):

        estoque = obj.estoque_total_calc or 0

        if estoque <= 5:
            return format_html(
                "<span style='color:red;font-weight:bold'>{}</span>",
                estoque,
            )

        return estoque

    estoque_total.short_description = "Estoque"

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


@admin.register(Lote)
class LoteAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "numero_lote",
        "validade",
        "quantidade_inicial",
        "saldo_atual",
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

    def saldo_atual(self, obj):

        saldo = obj.saldo_calc

        if saldo <= 5:
            return format_html("<span style='color:red;font-weight:bold'>{}</span>", saldo)

        return saldo

    saldo_atual.short_description = "Saldo"
    saldo_atual.admin_order_field = "saldo_calc"

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


@admin.register(MovimentoEstoque)
class MovimentoEstoqueAdmin(admin.ModelAdmin):
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
    model = ItemVenda
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


@admin.register(Venda)
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


@admin.register(CategoriaProduto)
class CategoriaProdutoAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "categoria_pai",
        "nivel_categoria",
        "criado_em",
    )

    search_fields = ("nome",)

    list_filter = ("categoria_pai",)

    ordering = ("nome",)

    list_per_page = 50

    list_select_related = ("categoria_pai",)

    readonly_fields = (
        "categorias_pai_referencia",
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
                "fields": ("categorias_pai_referencia",),
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

    def nivel_categoria(self, obj):
        return obj.nivel

    nivel_categoria.short_description = "Nível"

    def categorias_pai_referencia(self, obj):
        itens = format_html_join(
            "",
            "<li>{}</li>",
            ((categoria,) for categoria in CategoriaProduto.categorias_pai_referencia()),
        )
        return format_html("<ul>{}</ul>", itens)

    categorias_pai_referencia.short_description = "Categorias sugeridas"
