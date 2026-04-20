"""Configuração do Django Admin para o módulo de Enfermagem."""

from decimal import Decimal

from django import forms
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path
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
    """Retorna produtos com lotes não vencidos e saldo positivo (uso em autocomplete)."""
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
    """Inline para itens de serviço de um procedimento de enfermagem."""
    model = ProcedureItem
    extra = 1  # Sugere 1 linha para facilitar lançamento
    fields = (
        "catalog",
        "description",
        "quantity",
        "performed",
        "observation",
    )
    autocomplete_fields = ("catalog",)


class ProcedimentoMaterialInline(admin.TabularInline):
    """Inline para materiais consumidos em um procedimento de enfermagem.
    
    Permite edição de quantidade com estorno automático de estoque.
    Ao alterar quantidade, o sistema cria um movimento de entrada (estorno)
    e um novo movimento de saída com a quantidade atualizada.
    """
    model = ProcedureMaterial
    extra = 1
    fields = (
        "procedure_item",
        "product",
        "quantity",
        "lot",
        "unit_cost",
        "status_estorno",
        "observation",
    )
    readonly_fields = ("procedure_item", "unit_cost", "status_estorno")
    autocomplete_fields = ("product",)

    def status_estorno(self, obj):
        """Exibe status do movimento de estoque associado."""
        if not obj.inventory_movement:
            return "Pendente (não lançado)"
        return f"✓ Lançado: {obj.inventory_movement.custom_id}"
    
    status_estorno.short_description = "Status Estoque"

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "product":
            kwargs["queryset"] = _queryset_produtos_disponiveis()

        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class ProcedimentoCatalogoMaterialInline(admin.TabularInline):
    """Inline para materiais padrão de um catálogo de procedimento."""
    model = ProcedureCatalogMaterial
    extra = 1  # Sugere um material padrão por vez

    class ProcedimentoCatalogoMaterialInlineForm(forms.ModelForm):
        class Meta:
            model = ProcedureCatalogMaterial
            fields = (
                "product",
                "default_quantity",
                "default_unit_cost",
                "observation",
            )

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)

            # Não é editável aqui (é herdado do produto), mas mostramos como input
            # para permitir preenchimento automático via JS no admin inline.
            unit_cost = self.fields.get("default_unit_cost")
            if unit_cost is not None:
                unit_cost.widget.attrs["readonly"] = True

            if getattr(self.instance, "product_id", None) and unit_cost is not None:
                try:
                    self.initial["default_unit_cost"] = self.instance.product.sale_price
                except Exception:
                    pass

    form = ProcedimentoCatalogoMaterialInlineForm

    fields = (
        "product",
        "default_quantity",
        "default_unit_cost",
        "observation",
    )
    autocomplete_fields = ("product",)


@admin.register(ProcedureCatalog)
class ProcedimentoCatalogoAdmin(admin.ModelAdmin):
    """Administra catálogo de procedimentos e seus materiais padrão."""
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
    ordering = ("name",)  # Ordena por nome para catálogo
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

    def get_urls(self):
        urls = super().get_urls()

        custom = [
            path(
                "product-price/<int:product_id>/",
                self.admin_site.admin_view(self.product_price_view),
                name="enfermagem_procedurecatalog_product_price",
            ),
        ]

        return custom + urls

    def product_price_view(self, request, product_id: int):
        qs = Product.objects.only("id", "sale_price", "tenant_id").filter(id=product_id, deleted=False)
        tenant = getattr(request, "tenant", None)
        if tenant is not None:
            qs = qs.filter(tenant=tenant)

        product = qs.first()
        if not product:
            return JsonResponse({"detail": "Produto não encontrado."}, status=404)

        return JsonResponse({"sale_price": str(product.sale_price or Decimal("0.00"))})

    class Media:
        js = ("enfermagem/admin/procedure_catalog_material_inline.js",)


@admin.register(ProcedureCatalogMaterial)
class ProcedimentoCatalogoMaterialAdmin(admin.ModelAdmin):
    """Administra materiais padrão associados a cada catálogo de procedimento."""
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
    ordering = ("catalog", "product")  # Agrupa por catálogo
    autocomplete_fields = ("catalog", "product")
    list_select_related = ("catalog", "product")
    readonly_fields = (
        "custom_id",
        "default_unit_cost",
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
    """Admin para registros de enfermagem (observações/prioridade por paciente)."""
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
    ordering = ("-record_date",)  # Mais recentes primeiro
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
    """Admin de procedimentos de enfermagem com itens e materiais inlines."""
    list_display = (
        "custom_id",
        "patient",
        "professionals_display",
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
    )
    list_select_related = ("patient",)
    ordering = ("-performed_date",)  # Procedimentos mais recentes primeiro
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
    filter_horizontal = ("professional", "selected_catalogs", "selected_materials")
    # inlines defined in get_inlines
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
            "Procedimentos do Catálogo",
            {
                "fields": ("selected_catalogs",),
            },
        ),
        (
            "Materiais",
            {
                "fields": ("selected_materials",),
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
        """Quantidade de itens de serviço associados ao procedimento."""
        return obj.itens.count()

    itens_total.short_description = "Itens"

    def professionals_display(self, obj):
        """Lista os profissionais associados ao procedimento."""
        profissionais = list(obj.professional.all())
        if not profissionais:
            return "-"

        nomes = []
        for profissional in profissionais:
            nome = ""
            if hasattr(profissional, "get_full_name"):
                nome = (profissional.get_full_name() or "").strip()
            if not nome:
                nome = getattr(profissional, "name", "") or getattr(profissional, "username", "")
            nomes.append(nome or str(profissional.pk))

        return ", ".join(nomes)

    professionals_display.short_description = "Profissionais"

    def materiais_total(self, obj):
        """Quantidade de materiais consumidos no procedimento."""
        return obj.materiais.count()

    materiais_total.short_description = "Materiais"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related("professional")

    def get_inlines(self, request, obj=None):
        if obj is None:  # add form
            return []
        return [ProcedimentoItemInline, ProcedimentoMaterialInline]

    def _sync_items_from_selected_catalogs(self, procedure):
        """Cria itens de procedimento para catálogos selecionados ainda não lançados."""
        selected_catalog_ids = set(procedure.selected_catalogs.values_list("id", flat=True))
        if not selected_catalog_ids:
            return

        existing_catalog_ids = set(
            procedure.itens.filter(
                deleted=False,
                catalog_id__in=selected_catalog_ids,
            ).values_list("catalog_id", flat=True)
        )
        missing_catalog_ids = selected_catalog_ids - existing_catalog_ids
        if not missing_catalog_ids:
            return

        catalogs = ProcedureCatalog.objects.filter(pk__in=missing_catalog_ids).order_by("name")
        for catalog in catalogs:
            ProcedureItem.objects.create(
                procedure=procedure,
                catalog=catalog,
                quantity=1,
            )

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        procedure = form.instance

        self._sync_items_from_selected_catalogs(procedure)

        if not change:  # only on add
            for product in procedure.selected_materials.all():
                material = ProcedureMaterial(
                    procedure=procedure,
                    product=product,
                    quantity=1,  # quantidade mínima válida; pode ser ajustada depois
                    unit_cost=Decimal("0.00"),
                )
                # No cadastro inicial, registra apenas a intenção de uso sem baixar estoque.
                material.save(alocar_estoque=False)


@admin.register(ProcedureItem)
class ProcedimentoItemAdmin(admin.ModelAdmin):
    """Admin de itens de serviço executados em procedimentos."""
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
    ordering = ("-created_at",)  # Últimos itens lançados no topo
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
    """Admin de materiais consumidos em procedimentos de enfermagem."""
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
    ordering = ("-created_at",)  # Materiais consumidos mais recentes primeiro
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

    def fazer_estorno(self, request, queryset):
        """Ação para fazer estorno completo de materiais lançados no estoque."""
        from django.contrib import messages
        contador = 0
        for material in queryset:
            if material.inventory_movement_id:
                try:
                    material.delete()
                    contador += 1
                except Exception as e:
                    messages.error(request, f"Erro ao estornar {material.custom_id}: {str(e)}")
        
        messages.success(request, f"{contador} material(ais) estimado(s) com sucesso.")
    
    fazer_estorno.short_description = "Fazer estorno completo dos materiais selecionados"
    
    actions = ["fazer_estorno"]


@admin.register(ProcedureItemValue)
class ProcedureItemValueAdmin(admin.ModelAdmin):
    """Admin para valores unitários de itens de procedimento."""
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
    ordering = ("-created_at",)  # Valores mais recentes primeiro
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
    """Admin para valores unitários de materiais consumidos."""
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
    ordering = ("-created_at",)  # Valores mais recentes primeiro
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
    """Admin de sinais vitais coletados pela enfermagem."""
    list_display = (
        "custom_id",
        "patient",
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
    ordering = ("-collected_at",)  # Sinais mais recentes primeiro
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
                    "patient",
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
