"""Configuração do Django Admin para a app de farmácia.

Inclui comentários em português explicando os principais pontos linha a linha.
"""

from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms import ValidationError as FormValidationError
from django.forms.models import BaseInlineFormSet
from decimal import Decimal

from django.db.models import (
    Case,
    Exists,
    F,
    IntegerField,
    Min,
    Sum,
    When,
    DecimalField,
    ExpressionWrapper,
    Value,
    OuterRef,
    Subquery,
)
from django.db.models.functions import Coalesce
from django.utils.html import format_html, format_html_join

from .models.inventory_movement import (
    InventoryMovement,
    MovementOrigin,
    MovementType,
)
from .models.lot import Lot
from .models.product import Product
from .models.product_category import ParentCategory, ProductCategory
from .models.sale import Sale
from .models.sale_item import SaleItem
from .models.lot import Lot  # for stock check in inline

# =========================================================
# PRODUTO
# =========================================================


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Administração de produtos com colunas calculadas de estoque."""
    list_display = (
        "custom_id",
        "name",
        "category",
        "initial_stock",
        "sale_price",
        "vat_percentage",
        "applies_vat_by_default",
        "inventory_total",
        "proximo_vencimento",
        "created_at",
    )

    search_fields = ("custom_id", "name")
    list_filter = ("category",)
    ordering = ("name",)
    list_per_page = 50

    readonly_fields = (
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
        "version",
        "deleted_at",
        "deleted_by",
        "initial_stock",
        "inventory_total",
    )

    fieldsets = (
        (
            "Informações do Produto",
            {
                "fields": (
                    "name",
                    "category",
                    "sale_price",
                    "vat_percentage",
                    "applies_vat_by_default",
                )
            },
        ),
        (
            "Estoque",
            {
                "fields": (
                    "initial_stock",
                    "inventory_total",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                ),
            },
        ),
    )

    # =========================
    # QUERY OTIMIZADA
    # =========================

    def get_queryset(self, request):
        """Adiciona anotações de estoque para evitar consultas extras no admin."""

        qs = super().get_queryset(request)  # Queryset base

        initial_lots = (
            Lot.objects.filter(product=OuterRef("pk"))  # Seleciona lotes do produto
            .values("product")  # Agrupa por produto
            .annotate(total=Sum("initial_quantity"))  # Soma quantidades iniciais
            .values("total")  # Retorna apenas o total
        )

        movements = (
            InventoryMovement.objects.filter(
                lot__product=OuterRef("pk"),
                deleted=False,
            )
            .values("lot__product")
            .annotate(
                total=Coalesce(
                    Sum(
                        Case(
                            When(type=MovementType.SAIDA, then=-F("quantity")),
                            default=F("quantity"),
                            output_field=IntegerField(),
                        )
                    ),
                    0,
                )
            )
            .values("total")
        )

        missing_initial_stock = (
            Lot.objects.filter(product=OuterRef("pk"))
            .annotate(
                has_initial_entry=Exists(
                    InventoryMovement.all_objects.filter(
                        lot_id=OuterRef("pk"),
                        deleted=False,
                        type=MovementType.ENTRADA,
                        origin=MovementOrigin.AJUSTE,
                        quantity=OuterRef("initial_quantity"),
                    )
                )
            )
            .filter(has_initial_entry=False)
            .values("product")
            .annotate(total=Coalesce(Sum("initial_quantity"), 0))
            .values("total")
        )

        qs = qs.annotate(
            initial_stock_calc=Coalesce(Subquery(initial_lots), 0),  # Estoque inicial
            movements_total=Coalesce(Subquery(movements), 0),
            missing_initial_stock=Coalesce(Subquery(missing_initial_stock), 0),
            proximo_vencimento=Min("lotes__expiration_date"),  # Vencimento mais próximo
        )

        return qs.annotate(inventory_total_calc=F("movements_total") + F("missing_initial_stock"))

    # =========================
    # ESTOQUE
    # =========================

    def initial_stock(self, obj):
        """
        Exibe o estoque inicial somando as quantidades de todos os lotes.
        Usa o valor anotado (quantity_lotes) quando disponível para evitar
        consultas extras.
        """
        if hasattr(obj, "initial_stock_calc"):
            return obj.initial_stock_calc or 0  # Usa valor anotado na query
        return obj.initial_stock  # Fallback para propriedade do modelo

    initial_stock.short_description = "Estoque inicial"
    initial_stock.admin_order_field = "initial_stock_calc"

    def inventory_total(self, obj):

        inventory = obj.inventory_total_calc or 0  # Estoque total anotado

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
        """Mostra a data de vencimento mais próxima ou '-'."""

        if not obj.proximo_vencimento:
            return "-"

        return obj.proximo_vencimento

    proximo_vencimento.short_description = "Próximo vencimento"


# =========================================================
# LOTE
# =========================================================


@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):
    """Administra lotes com saldo calculado e alerta de vencimento."""
    list_display = (
        "product",
        "lot_number",
        "expiration_date",
        "initial_quantity",
        "sale_price",
        "current_balance",
        "vencido_status",
    )

    search_fields = (
        "lot_number",
        "product__name",
    )

    list_filter = (
        "expiration_date",
        "product",
    )

    ordering = ("expiration_date",)

    list_select_related = ("product",)

    readonly_fields = (
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
        "version",
        "deleted_at",
        "deleted_by",
    )

    fieldsets = (
        (
            "Informações do Lote",
            {
                "fields": (
                    "product",
                    "lot_number",
                    "expiration_date",
                    "initial_quantity",
                    "sale_price",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                ),
            },
        ),
    )

    list_per_page = 50

    # =========================
    # QUERY OTIMIZADA
    # =========================

    def get_queryset(self, request):

        qs = super().get_queryset(request)  # Queryset base com filtros padrão

        has_initial_entry = Exists(
            InventoryMovement.all_objects.filter(
                lot_id=OuterRef("pk"),
                deleted=False,
                type=MovementType.ENTRADA,
                origin=MovementOrigin.AJUSTE,
                quantity=OuterRef("initial_quantity"),
            )
        )

        movimentos_total = Coalesce(
            Sum(
                Case(
                    When(
                        movimentos__type=MovementType.SAIDA,
                        then=-F("movimentos__quantity"),
                    ),
                    default=F("movimentos__quantity"),
                    output_field=IntegerField(),
                )
            ),
            0,
        )

        return qs.annotate(
            movimentos_total=movimentos_total,
            has_initial_entry=has_initial_entry,
        ).annotate(
            saldo_calc=Case(
                When(
                    has_initial_entry=True,
                    then=F("movimentos_total"),
                ),
                default=F("initial_quantity") + F("movimentos_total"),
                output_field=IntegerField(),
            )
        )

    # =========================
    # SALDO
    # =========================

    def current_balance(self, obj):

        saldo = obj.saldo_calc  # Usa anotação para não reconsultar o banco

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
    """Listagem apenas leitura de movimentos de estoque."""
    list_display = (
        "lot",
        "type",
        "origin",
        "purchase_item",
        "sale_item",
        "quantity",
        "created_at",
    )

    list_filter = (
        "type",
        "origin",
        "created_at",
    )

    search_fields = (
        "lot__lot_number",
        "lot__product__name",
        "sale_item__sale__number",
        "sale_item__sale__custom_id",
    )

    list_select_related = (
        "lot",
        "lot__product",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "lot",
        "type",
        "origin",
        "purchase_item",
        "sale_item",
        "quantity",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
        "version",
    )

    fieldsets = (
        (
            "Movimento",
            {
                "fields": (
                    "lot",
                    "type",
                    "origin",
                    "purchase_item",
                    "sale_item",
                    "quantity",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "updated_at",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )

    list_per_page = 50

    def purchase_item(self, obj):
        if obj.type == MovementType.ENTRADA:
            return f"{obj.lot.product} - Lote {obj.lot.lot_number}"
        return "-"

    purchase_item.short_description = "Item de compra"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# =========================================================
# ITEM VENDA INLINE
# =========================================================


class ItemVendaInline(admin.TabularInline):
    """Inline de itens de venda para edição dentro da venda."""

    model = SaleItem
    extra = 0
    # formset set below after class definition

    autocomplete_fields = ("product",)

    readonly_fields = ("unit_price", "total_linha_formatado",)

    fields = (
        "product",
        "quantity",
        "unit_price",
        "total_linha_formatado",
    )

    def total_linha_formatado(self, obj):

        if not obj.pk:
            return "-"  # Nada para exibir enquanto não salvo

        return f"{obj.total_linha:.2f}"

    total_linha_formatado.short_description = "Total"


class SaleItemInlineFormSet(BaseInlineFormSet):
    def clean(self):
        """Valida saldo disponível por produto antes de salvar inline."""
        super().clean()

        for form in self.forms:
            if form.cleaned_data.get("DELETE"):
                continue  # Ignora itens marcados para exclusão
            if not form.cleaned_data:
                continue  # Form vazio (extra)

            product = form.cleaned_data.get("product")
            qty = form.cleaned_data.get("quantity") or 0

            if not product or qty <= 0:
                continue  # Nada a validar

            # Disponível por produto somando lotes não vencidos (FEFO helper)
            available = 0
            for lot in Lot.disponiveis(product):
                saldo = getattr(lot, "saldo", None)
                if callable(saldo):
                    saldo = saldo()
                elif saldo is None:
                    saldo = lot.balance()
                available += max(saldo, 0)

            if qty > available:
                msg = f"Estoque insuficiente para {product.name}: solicitado {qty}, disponível {available}."
                form.add_error("quantity", msg)


# attach custom formset to inline
ItemVendaInline.formset = SaleItemInlineFormSet


# =========================================================
# ITEM DE VENDA (ADMIN DIRETO)
# =========================================================


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    """Admin direto de itens de venda (visualização)."""
    list_display = (
        "sale",
        "product",
        "quantity",
        "unit_price",
        "linha_total",
        "created_at",
    )

    search_fields = ("sale__number", "product__name")
    list_filter = ("product", "sale__created_at")
    ordering = ("-created_at",)
    readonly_fields = (
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
        "version",
        "deleted_at",
        "deleted_by",
    )

    def linha_total(self, obj):
        return f"{obj.total_linha:.2f}"

    linha_total.short_description = "Total"


# =========================================================
# VENDA
# =========================================================


@admin.register(Sale)
class VendaAdmin(admin.ModelAdmin):
    """Administra vendas com cálculos agregados de itens e impostos."""

    list_display = (
        "number",
        "patient",
        "total_items_quantity",
        "unit_prices",
        "total_items_amount",
        "total_vat_amount",
        "total",
        "created_at",
    )

    search_fields = (
        "number",
        "custom_id",
    )

    list_filter = ("created_at",)

    ordering = ("-created_at",)

    list_per_page = 50

    inlines = [ItemVendaInline]

    readonly_fields = (
        "number",
        "total_items_quantity",
        "total_items_amount",
        "total_vat_amount",
        "total",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
        "version",
        "deleted_at",
        "deleted_by",
    )

    fieldsets = (
        (
            "Informações da Venda",
            {
                "fields": (
                    "number",
                    "patient",
                    "total_items_quantity",
                    "total_items_amount",
                    "total_vat_amount",
                    "total",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                ),
            },
        ),
    )

    autocomplete_fields = ("patient",)

    # =========================
    # QUERY OTIMIZADA
    # =========================

    def get_queryset(self, request):
        qs = super().get_queryset(request)  # Queryset base

        total_items_expr = F("itens__quantity") * F("itens__unit_price")  # Subtotal por item

        vat_expr = ExpressionWrapper(
            F("itens__quantity")
            * F("itens__unit_price")
            * F("itens__product__vat_percentage")
            / Value(100),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )

        qs = qs.annotate(
            total_items_qty=Coalesce(Sum("itens__quantity"), 0),  # Quantidade total
            total_items_amount=Coalesce(
                Sum(
                    total_items_expr,
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            ),
            total_vat_amount=Coalesce(
                Sum(
                    Case(
                        When(
                            itens__product__applies_vat_by_default=True,
                            then=vat_expr,  # Calcula IVA só quando aplicável
                        ),
                        default=Value(0),
                        output_field=DecimalField(max_digits=14, decimal_places=2),
                    ),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            ),
        )
        return qs.prefetch_related("itens__product")  # Evita N+1 nos produtos

    # =========================
    # CAMPOS COMPUTADOS
    # =========================

    def total_items_quantity(self, obj):
        return obj.total_items_qty or 0

    total_items_quantity.short_description = "Qtd. itens"
    total_items_quantity.admin_order_field = "total_items_qty"

    def total_items_amount(self, obj):
        return f"{(obj.total_items_amount or Decimal('0.00')):.2f}"

    total_items_amount.short_description = "Subtotal itens"
    total_items_amount.admin_order_field = "total_items_amount"

    def total_vat_amount(self, obj):
        return f"{(obj.total_vat_amount or Decimal('0.00')):.2f}"

    total_vat_amount.short_description = "Valor IVA"
    total_vat_amount.admin_order_field = "total_vat_amount"

    def unit_prices(self, obj):
        qs = getattr(obj, "itens", None)
        if qs is None:
            return "-"
        items = list(qs.all())
        if not items:
            return "-"
        prices = [f"{(item.unit_price or Decimal('0.00')):.2f}" for item in items]
        return "; ".join(prices)

    unit_prices.short_description = "Preço unit."


@admin.register(ParentCategory)
class ParentCategoryAdmin(admin.ModelAdmin):
    """Administra categorias-pai com ação de criação sugerida."""
    list_display = ("name", "created_at")
    search_fields = ("name",)
    ordering = ("name",)
    actions = ["criar_categorias_sugeridas"]
    readonly_fields = (
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
        "version",
        "deleted_at",
        "deleted_by",
    )

    fieldsets = (
        (
            "Categoria Pai",
            {
                "fields": (
                    "name",
                    "description",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                ),
            },
        ),
    )

    @admin.action(description="Criar categorias-pai sugeridas")
    def criar_categorias_sugeridas(self, request, queryset):
        existentes = set(
            ParentCategory.objects.filter(name__in=ProductCategory.parent_category_references())
            .values_list("name", flat=True)
        )
        criadas = 0
        for name in ProductCategory.parent_category_references():
            if name in existentes:
                continue
            ParentCategory.objects.create(name=name)
            criadas += 1
        if criadas:
            self.message_user(request, f"{criadas} categoria(s) pai criada(s).")
        else:
            self.message_user(request, "Nenhuma categoria sugerida pendente.", level="info")


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    """Admin de categorias de produto com referência a categorias-pai."""
    list_display = (
        "name",
        "parent_category",
        "category_level",
        "created_at",
    )

    search_fields = ("name",)

    list_filter = ("parent_category",)

    ordering = ("name",)

    list_per_page = 50

    def purchase_item(self, obj):
        if obj.type == MovementType.ENTRADA:
            return f"{obj.lot.product} - Lote {obj.lot.lot_number}"
        return "-"

    purchase_item.short_description = "Item de compra"

    list_select_related = ("parent_category",)
    autocomplete_fields = ("parent_category",)

    readonly_fields = (
        "parent_category_references",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
        "version",
        "deleted_at",
        "deleted_by",
    )

    fieldsets = (
        (
            "Informações da Categoria",
            {
                "fields": (
                    "name",
                    "description",
                    "parent_category",
                )
            },
        ),
        (
            "Categorias-pai de Referência",
            {
                "description": "Sugestões para classificação inicial (não salvas automaticamente no banco de dados). Use o botão “+” ao lado de Categoria pai para criar se não existir.",
                "fields": ("parent_category_references",),
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
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
            ((category,) for category in ProductCategory.parent_category_references()),
        )
        return format_html("<ul>{}</ul>", itens)

    parent_category_references.short_description = "Categorias sugeridas"


ProductAdmin.estoque_total = ProductAdmin.inventory_total
LotAdmin.current_balance = LotAdmin.current_balance
ProductCategoryAdmin.nivel_category = ProductCategoryAdmin.category_level
ProductCategoryAdmin.categorias_pai_referencia = ProductCategoryAdmin.parent_category_references
