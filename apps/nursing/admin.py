"""Configuração do Django Admin para o módulo de Enfermagem."""

from contextlib import suppress
from decimal import Decimal

from django import forms
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.db.models import Case, Exists, F, IntegerField, OuterRef, Sum, When
from django.db.models.functions import Coalesce
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils import timezone

from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from tasks.generate_pdf import SimplePDFAdminMixin, pdf_action_link

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
    Ward,
    WardAdmission,
    WardBed,
)


def _available_products_queryset():
    """Retorna produtos com lotes não vencidos e saldo positivo (uso em autocomplete)."""
    today = timezone.localdate()

    available_lots = (
        Lot.objects.filter(
            product_id=OuterRef("pk"),
            expiration_date__gte=today,
        )
        .annotate(
            calculated_balance=F("initial_quantity")
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
        .filter(calculated_balance__gt=0)
    )

    return Product.objects.filter(Exists(available_lots)).order_by("name")


class ProcedureMaterialAdminForm(forms.ModelForm):
    class Meta:
        model = ProcedureMaterial
        fields = "__all__"
        labels = {
            "procedure": "Procedimento",
            "product": "Produto farmacêutico / médico-cirúrgico",
            "procedure_item": "Item do procedimento (herdado, opcional)",
            "lot": "Lote específico",
            "quantity": "Quantidade",
            "observation": "Observações",
        }
        help_texts = {
            "procedure": "O paciente fica vinculado somente ao procedimento.",
            "product": "Use medicamentos, materiais, reagentes, insumos e outros produtos farmacêuticos ou médico-cirúrgicos.",
            "procedure_item": "Preenchido quando o material foi gerado a partir de um item do procedimento.",
            "lot": "Opcional no lançamento manual; o sistema pode selecionar um lote disponível.",
        }


class ProcedimentoItemInline(admin.TabularInline):
    """Inline para itens de serviço de um procedimento de enfermagem."""
    model = ProcedureItem
    extra = 1  # Sugere 1 linha para facilitar lançamento
    fields = (
        "ward",
        "position",
        "catalog",
        "description",
        "quantity",
        "performed",
        "observation",
    )
    readonly_fields = ("ward",)
    ordering = ("position", "id")
    autocomplete_fields = ("catalog",)


class ProcedimentoMaterialInline(admin.TabularInline):
    """Inline para materiais consumidos em um procedimento de enfermagem.

    Permite edição de quantidade com estorno automático de estoque.
    Ao alterar quantidade, o sistema cria um movimento de entrada (estorno)
    e um novo movimento de saída com a quantidade atualizada.
    """
    model = ProcedureMaterial
    form = ProcedureMaterialAdminForm
    extra = 1
    fields = (
        "ward",
        "position",
        "procedure_item",
        "product",
        "quantity",
        "lot",
        "unit_cost",
        "stock_reversal_status",
        "observation",
    )
    ordering = ("position", "id")
    readonly_fields = ("ward", "procedure_item", "unit_cost", "stock_reversal_status")
    autocomplete_fields = ("product",)

    def stock_reversal_status(self, obj):
        """Exibe status do movimento de estoque associado."""
        if not obj.inventory_movement:
            return "Pendente (não lançado)"
        return f"✓ Lançado: {obj.inventory_movement.custom_id}"

    stock_reversal_status.short_description = "Status Estoque"

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "product":
            kwargs["queryset"] = _available_products_queryset()

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
                with suppress(Exception):
                    self.initial["default_unit_cost"] = self.instance.product.sale_price

    form = ProcedimentoCatalogoMaterialInlineForm

    fields = (
        "ward",
        "product",
        "default_quantity",
        "default_unit_cost",
        "observation",
    )
    readonly_fields = ("ward",)
    autocomplete_fields = ("product",)


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    """Administra enfermarias/alas usadas como contexto dos cuidados."""

    list_display = (
        "custom_id",
        "name",
        "active",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "name",
        "description",
    )
    list_filter = ("active", "created_at")
    ordering = ("name",)
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
            "Enfermaria",
            {
                "fields": (
                    "custom_id",
                    "name",
                    "description",
                    "active",
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


@admin.register(WardBed)
class WardBedAdmin(admin.ModelAdmin):
    """Administra camas vinculadas a uma enfermaria."""

    list_display = (
        "custom_id",
        "ward",
        "number",
        "active",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "ward__name",
        "number",
    )
    list_filter = ("ward", "active", "created_at")
    ordering = ("ward__name", "number")
    autocomplete_fields = ("ward",)
    list_select_related = ("ward",)
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
            "Cama",
            {
                "fields": (
                    "custom_id",
                    "ward",
                    "number",
                    "active",
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


@admin.register(WardAdmission)
class WardAdmissionAdmin(admin.ModelAdmin):
    """Administra internamentos e a enfermaria herdada da cama."""

    list_display = (
        "custom_id",
        "patient",
        "ward",
        "bed",
        "admission_date",
        "expected_discharge_date",
        "discharged_at",
        "active",
    )
    search_fields = (
        "custom_id",
        "patient__name",
        "ward__name",
        "bed__number",
        "next_medication_description",
    )
    list_filter = ("ward", "active", "admission_date", "discharged_at")
    ordering = ("-admission_date",)
    autocomplete_fields = ("patient", "bed")
    list_select_related = ("patient", "ward", "bed")
    readonly_fields = (
        "custom_id",
        "ward",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
    )
    fieldsets = (
        (
            "Internamento",
            {
                "fields": (
                    "custom_id",
                    "patient",
                    "bed",
                    "ward",
                    "estimated_observation_hours",
                    "admission_date",
                    "expected_discharge_date",
                    "discharged_at",
                    "active",
                )
            },
        ),
        (
            "Próxima medicação",
            {
                "fields": (
                    "next_medication_description",
                    "next_medication_at",
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


@admin.register(ProcedureCatalog)
class ProcedimentoCatalogoAdmin(admin.ModelAdmin):
    """Administra catálogo de procedimentos e seus materiais padrão."""
    list_display = (
        "custom_id",
        "name",
        "ward",
        "default_price",
        "vat_percentage",
        "applies_vat_by_default",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "name",
        "ward__name",
        "description",
    )
    list_filter = ("ward", "created_at")
    autocomplete_fields = ("ward",)
    list_select_related = ("ward",)
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
                    "ward",
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
        "ward",
        "catalog",
        "product",
        "default_quantity",
        "default_unit_cost",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "ward__name",
        "catalog__name",
        "product__name",
    )
    list_filter = (
        "ward",
        "catalog",
        "created_at",
    )
    ordering = ("catalog", "product")  # Agrupa por catálogo
    autocomplete_fields = ("catalog", "product")
    list_select_related = ("ward", "catalog", "product")
    readonly_fields = (
        "custom_id",
        "ward",
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
                    "ward",
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
        "ward",
        "lab_request",
        "record_kind",
        "origin_role",
        "priority",
        "record_date",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "name",
        "patient__name",
        "ward__name",
        "lab_request__custom_id",
        "origin_role",
    )
    list_filter = (
        "ward",
        "record_kind",
        "origin_role",
        "priority",
        "record_date",
    )
    autocomplete_fields = ("patient", "ward")
    list_select_related = ("patient", "ward", "lab_request")
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
                    "ward",
                    "lab_request",
                    "record_kind",
                    "origin_role",
                    "priority",
                    "observation",
                    "collection_guidance",
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
class ProcedimentoAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    """Admin de procedimentos de enfermagem com itens e materiais inlines."""
    list_display = (
        "custom_id",
        "patient",
        "ward",
        "professionals_display",
        "performed_date",
        "itens_total",
        "materiais_total",
        "total",
        "pdf_link",
        "created_at",
        "get_pdf_button_html",
    )
    search_fields = (
        "custom_id",
        "patient__name",
        "ward__name",
        "notes",
    )
    list_filter = (
        "ward",
        "performed_date",
        "created_at",
    )
    autocomplete_fields = (
        "patient",
        "ward",
    )
    list_select_related = ("patient", "ward")
    ordering = ("-performed_date",)  # Procedimentos mais recentes primeiro
    readonly_fields = (
        "custom_id",
        "pdf_link",
        "services_subtotal",
        "materials_subtotal",
        "total",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "version",
        "get_pdf_button_html",
    )
    filter_horizontal = ("professional", "selected_catalogs", "selected_materials")
    # inlines defined in get_inlines
    fieldsets = (
        (
            "Procedimento",
            {
                "fields": (
                    "custom_id",
                    "pdf_link",
                    "tenant",
                    "patient",
                    "ward",
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

    def get_urls(self):
        urls = super().get_urls()
        app_label = self.model._meta.app_label
        model_name = self.model._meta.model_name
        extra = [
            path(
                "<path:object_id>/pdf/",
                self.admin_site.admin_view(self.procedure_pdf_view),
                name=f"{app_label}_{model_name}_pdf",
            ),
        ]
        return extra + urls

    def pdf_link(self, obj):
        if not getattr(obj, "pk", None):
            return "-"
        app_label = self.model._meta.app_label
        model_name = self.model._meta.model_name
        url = reverse(f"admin:{app_label}_{model_name}_pdf", args=[obj.pk])
        return pdf_action_link(url, "Gerar PDF", title="Gerar PDF do procedimento")

    pdf_link.short_description = "PDF"

    def procedure_pdf_view(self, request, object_id: str):
        procedure = self.get_object(request, object_id)
        if procedure is None:
            raise Http404("Procedimento não encontrado.")
        if not self.has_view_permission(request, procedure):
            raise PermissionDenied("Sem permissão para visualizar este procedimento.")

        from tasks.generate_pdf.procedure_pdf_generator import generate_procedure_pdf

        try:
            pdf_bytes, filename = generate_procedure_pdf(procedure, request=request)
        except Exception as exc:
            messages.error(request, f"Falha ao gerar PDF: {exc}")
            return redirect(
                reverse(
                    f"admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change",
                    args=[procedure.pk],
                )
            )

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

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
        "ward",
        "position",
        "catalog",
        "description",
        "quantity",
        "performed",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "ward__name",
        "catalog__name",
        "description",
        "procedure__custom_id",
        "procedure__patient__name",
    )
    list_filter = ("ward", "performed", "created_at")
    autocomplete_fields = ("procedure", "catalog")
    list_select_related = ("procedure", "procedure__patient", "ward", "catalog")
    ordering = ("procedure", "position", "id")
    readonly_fields = (
        "custom_id",
        "ward",
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
                    "ward",
                    "position",
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
    """Admin de produtos vinculados ao procedimento, sem paciente direto."""

    form = ProcedureMaterialAdminForm
    list_display = (
        "custom_id",
        "procedure",
        "ward",
        "position",
        "procedure_item",
        "product",
        "lot",
        "quantity",
        "unit_cost",
        "line_total",
        "inventory_movement",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "ward__name",
        "product__name",
        "lot__lot_number",
        "procedure__custom_id",
        "procedure_item__custom_id",
    )
    list_filter = ("ward", "created_at", "product")
    autocomplete_fields = (
        "procedure",
        "procedure_item",
        "product",
    )
    list_select_related = (
        "procedure",
        "ward",
        "procedure_item",
        "product",
        "lot",
        "inventory_movement",
    )
    ordering = ("procedure", "position", "id")
    readonly_fields = (
        "custom_id",
        "ward",
        "lot",
        "unit_cost",
        "line_total",
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
                    "ward",
                    "position",
                    "procedure_item",
                    "product",
                    "lot",
                    "quantity",
                    "unit_cost",
                    "line_total",
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
            kwargs["queryset"] = _available_products_queryset()

        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def line_total(self, obj):
        return f"{obj.total_linha:.2f}"

    line_total.short_description = "Total"

    def reverse_stock_movements(self, request, queryset):
        """Ação para fazer estorno completo de materiais lançados no estoque."""
        from django.contrib import messages
        reversed_count = 0
        for material in queryset:
            if material.inventory_movement_id:
                try:
                    material.delete()
                    reversed_count += 1
                except Exception as e:
                    messages.error(request, f"Erro ao estornar {material.custom_id}: {e!s}")

        messages.success(request, f"{reversed_count} material(ais) estornado(s) com sucesso.")

    reverse_stock_movements.short_description = "Fazer estorno completo dos materiais selecionados"

    actions = ["reverse_stock_movements"]


@admin.register(ProcedureItemValue)
class ProcedureItemValueAdmin(admin.ModelAdmin):
    """Admin para valores unitários de itens de procedimento."""
    list_display = (
        "custom_id",
        "ward",
        "item",
        "unit_price",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "ward__name",
        "item__custom_id",
        "item__description",
        "item__procedure__custom_id",
    )
    list_filter = ("ward", "created_at")
    autocomplete_fields = ("item",)
    list_select_related = ("ward", "item", "item__procedure")
    ordering = ("-created_at",)  # Valores mais recentes primeiro
    readonly_fields = (
        "custom_id",
        "ward",
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
                    "ward",
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
        "ward",
        "material",
        "unit_cost",
        "created_at",
    )
    search_fields = (
        "custom_id",
        "ward__name",
        "material__custom_id",
        "material__product__name",
        "material__procedure__custom_id",
    )
    list_filter = ("ward", "created_at")
    autocomplete_fields = ("material",)
    list_select_related = ("ward", "material", "material__procedure", "material__product")
    ordering = ("-created_at",)  # Valores mais recentes primeiro
    readonly_fields = (
        "custom_id",
        "ward",
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
                    "ward",
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
        "ward",
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
        "ward__name",
        "record__patient__name",
    )
    list_filter = ("ward", "collected_at")
    autocomplete_fields = ("record",)
    list_select_related = ("ward", "record", "record__patient")
    ordering = ("-collected_at",)  # Sinais mais recentes primeiro
    readonly_fields = (
        "custom_id",
        "ward",
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
                    "ward",
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
