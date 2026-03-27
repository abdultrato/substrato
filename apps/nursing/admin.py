from django.contrib import admin
from django.db.models import Case, Exists, F, IntegerField, OuterRef, Sum, When
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product

from .models import (
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
)


def _queryset_produtos_disponiveis():
    hoje = timezone.localdate()

    lotes_disponiveis = (
        Lot.objects.filter(
            product_id=OuterRef("pk"),
            expiration_date__gte=hoje,
        )
        .annotate(
            saldo_calc=F("initial_quantity")
            + Coalesce(
                Sum(
                    Case(
                        When(
                            movimentos__deleted=False,
                            movimentos__type="SAI",
                            then=-F("movimentos__quantity"),
                        ),
                        When(
                            movimentos__deleted=False,
                            then=F("movimentos__quantity"),
                        ),
                        default=0,
                        output_field=IntegerField(),
                    )
                ),
                0,
            )
        )
        .filter(saldo_calc__gt=0)
    )

    return Product.objects.filter(Exists(lotes_disponiveis)).order_by("name")


class ProcedimentoItemInline(admin.TabularInline):
    model = ProcedureItem
    extra = 1
    fields = (
        "catalog",
        "description",
        "quantity",
        "performed",
        "observation",
    )
    autocomplete_fields = ("catalog",)


class ProcedimentoMaterialInline(admin.TabularInline):
    model = ProcedureMaterial
    extra = 1
    fields = (
        "procedure_item",
        "product",
        "quantity",
        "lot",
        "unit_cost",
        "inventory_movement",
        "observation",
    )
    readonly_fields = ("procedure_item", "lot", "unit_cost", "inventory_movement")
    autocomplete_fields = ("product",)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "product":
            kwargs["queryset"] = _queryset_produtos_disponiveis()

        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class ProcedimentoCatalogoMaterialInline(admin.TabularInline):
    model = ProcedureCatalogMaterial
    extra = 1
    fields = (
        "product",
        "default_quantity",
        "default_unit_cost",
        "observation",
    )
    autocomplete_fields = ("product",)


@admin.register(ProcedureCatalog)
class ProcedimentoCatalogoAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "name",
        "default_price",
        "vat_percentage",
        "applies_vat_by_default",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "name",
        "description",
    )
    list_filter = ("created_at",)
    ordering = ("name",)
    readonly_fields = (
        "custom_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    inlines = (ProcedimentoCatalogoMaterialInline,)
    fieldsets = (
        (
            "Procedimento do Catálogo",
            {
                "fields": (
                    "custom_id",
                    "name",
                    "description",
                    "default_price",
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
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )


@admin.register(ProcedureCatalogMaterial)
class ProcedimentoCatalogoMaterialAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "catalog",
        "product",
        "default_quantity",
        "default_unit_cost",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "catalog__name",
        "product__name",
    )
    list_filter = (
        "catalog",
        "created_at",
    )
    ordering = ("catalog", "product")
    autocomplete_fields = ("catalog", "product")
    list_select_related = ("catalog", "product")
    readonly_fields = (
        "custom_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    fieldsets = (
        (
            "Material Padrão",
            {
                "fields": (
                    "custom_id",
                    "catalog",
                    "product",
                    "default_quantity",
                    "default_unit_cost",
                    "observation",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )


@admin.register(NursingRecord)
class NursingRecordAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "name",
        "patient",
        "priority",
        "record_date",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "name",
        "patient__name",
    )
    list_filter = (
        "priority",
        "record_date",
    )
    autocomplete_fields = ("patient",)
    list_select_related = ("patient",)
    ordering = ("-record_date",)
    readonly_fields = (
        "custom_id",
        "record_date",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    fieldsets = (
        (
            "Registro de Enfermagem",
            {
                "fields": (
                    "custom_id",
                    "name",
                    "patient",
                    "priority",
                    "observation",
                    "record_date",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )


@admin.register(Procedure)
class ProcedimentoAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "patient",
        "professional",
        "performed_date",
        "itens_total",
        "materiais_total",
        "total",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "patient__name",
        "notes",
    )
    list_filter = (
        "performed_date",
        "created_at",
    )
    autocomplete_fields = (
        "patient",
        "professional",
    )
    list_select_related = ("patient", "professional")
    ordering = ("-performed_date",)
    readonly_fields = (
        "custom_id",
        "services_subtotal",
        "materials_subtotal",
        "total",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    inlines = (ProcedimentoItemInline, ProcedimentoMaterialInline)
    fieldsets = (
        (
            "Procedimento",
            {
                "fields": (
                    "custom_id",
                    "tenant",
                    "patient",
                    "professional",
                    "performed_date",
                    "notes",
                    "services_subtotal",
                    "materials_subtotal",
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
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )

    def itens_total(self, obj):
        return obj.itens.count()

    itens_total.short_description = "Itens"

    def materiais_total(self, obj):
        return obj.materiais.count()

    materiais_total.short_description = "Materiais"


@admin.register(ProcedureItem)
class ProcedimentoItemAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "procedure",
        "catalog",
        "description",
        "quantity",
        "performed",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "catalog__name",
        "description",
        "procedure__custom_id",
        "procedure__patient__name",
    )
    list_filter = ("performed", "created_at")
    autocomplete_fields = ("procedure", "catalog")
    list_select_related = ("procedure", "procedure__patient", "catalog")
    ordering = ("-created_at",)
    readonly_fields = (
        "custom_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    fieldsets = (
        (
            "Item de Procedimento",
            {
                "fields": (
                    "custom_id",
                    "procedure",
                    "catalog",
                    "description",
                    "quantity",
                    "performed",
                    "observation",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )


@admin.register(ProcedureMaterial)
class ProcedimentoMaterialAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "procedure",
        "procedure_item",
        "product",
        "lot",
        "quantity",
        "unit_cost",
        "linha_total",
        "inventory_movement",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "product__name",
        "lot__lot_number",
        "procedure__custom_id",
        "procedure__patient__name",
        "procedure_item__custom_id",
    )
    list_filter = ("created_at", "product")
    autocomplete_fields = (
        "procedure",
        "procedure_item",
        "product",
    )
    list_select_related = (
        "procedure",
        "procedure_item",
        "product",
        "lot",
        "inventory_movement",
    )
    ordering = ("-created_at",)
    readonly_fields = (
        "custom_id",
        "lot",
        "unit_cost",
        "linha_total",
        "inventory_movement",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    fieldsets = (
        (
            "Material do Procedimento",
            {
                "fields": (
                    "custom_id",
                    "procedure",
                    "procedure_item",
                    "product",
                    "lot",
                    "quantity",
                    "unit_cost",
                    "linha_total",
                    "inventory_movement",
                    "observation",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "product":
            kwargs["queryset"] = _queryset_produtos_disponiveis()

        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def linha_total(self, obj):
        return f"{obj.total_linha:.2f}"

    linha_total.short_description = "Total"


@admin.register(ProcedureItemValue)
class ProcedureItemValueAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "item",
        "unit_price",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "item__custom_id",
        "item__description",
        "item__procedure__custom_id",
    )
    list_filter = ("created_at",)
    autocomplete_fields = ("item",)
    list_select_related = ("item", "item__procedure")
    ordering = ("-created_at",)
    readonly_fields = (
        "custom_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    fieldsets = (
        (
            "Valor do Item",
            {
                "fields": (
                    "custom_id",
                    "item",
                    "unit_price",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )


@admin.register(ProcedureMaterialValue)
class ProcedureMaterialValueAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "material",
        "unit_cost",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "material__custom_id",
        "material__product__name",
        "material__procedure__custom_id",
    )
    list_filter = ("created_at",)
    autocomplete_fields = ("material",)
    list_select_related = ("material", "material__procedure", "material__product")
    ordering = ("-created_at",)
    readonly_fields = (
        "custom_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    fieldsets = (
        (
            "Valor do Material",
            {
                "fields": (
                    "custom_id",
                    "material",
                    "unit_cost",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )


@admin.register(NursingVitalSign)
class SinalVitalEnfermagemAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "name",
        "record",
        "temperature_c",
        "heart_rate",
        "oxygen_saturation",
        "collected_at",
    )
    search_fields = (
        "custom_id",
        "name",
        "record__patient__name",
    )
    list_filter = ("collected_at",)
    autocomplete_fields = ("record",)
    list_select_related = ("record", "record__patient")
    ordering = ("-collected_at",)
    readonly_fields = (
        "custom_id",
        "collected_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    fieldsets = (
        (
            "Sinais Vitais",
            {
                "fields": (
                    "custom_id",
                    "name",
                    "record",
                    "temperature_c",
                    "heart_rate",
                    "respiratory_rate",
                    "oxygen_saturation",
                    "blood_pressure",
                    "collected_at",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "version",
                ),
            },
        ),
    )


