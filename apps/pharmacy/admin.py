from django.contrib import admin
from django.db.models import Case, F, IntegerField, Min, Sum, When
from django.db.models.functions import Coalesce
from django.utils.html import format_html, format_html_join

from .models.inventory_movement import InventoryMovement
from .models.lot import Lot
from .models.product import Product
from .models.product_category import ProductCategory
from .models.sale import Sale
from .models.sale_item import SaleItem

# =========================================================
# PRODUTO
# =========================================================


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "name",
        "category",
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

        qs = super().get_queryset(request)

        qs = qs.annotate(
            quantity_lotes=Coalesce(
                Sum("lotes__initial_quantity"),
                0,
            ),
            movimentos_total=Coalesce(
                Sum(
                    Case(
                        When(
                            lotes__movimentos__type="SAI",
                            then=-F("lotes__movimentos__quantity"),
                        ),
                        default=F("lotes__movimentos__quantity"),
                        output_field=IntegerField(),
                    )
                ),
                0,
            ),
            proximo_vencimento=Min("lotes__expiration_date"),
        )

        return qs.annotate(inventory_total_calc=F("quantity_lotes") + F("movimentos_total"))

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
        "product",
        "lot_number",
        "expiration_date",
        "initial_quantity",
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

        qs = super().get_queryset(request)

        return qs.annotate(
            saldo_calc=F("initial_quantity")
            + Coalesce(
                Sum(
                    Case(
                        When(
                            movimentos__type="SAI",
                            then=-F("movimentos__quantity"),
                        ),
                        default=F("movimentos__quantity"),
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
        "lot",
        "type",
        "origin",
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

    autocomplete_fields = ("product",)

    readonly_fields = ("total_linha_formatado",)

    fields = (
        "product",
        "quantity",
        "unit_price",
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
        "number",
        "patient",
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


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
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

    list_select_related = ("parent_category",)

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
                "description": "Sugestões para classificação inicial (não salvas automaticamente no banco de dados).",
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
