from django.contrib import admin
from django.db.models import Case, Exists, F, IntegerField, OuterRef, Sum, When
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product

from .models import (
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
    NursingRecord,
    NursingVitalSign,
)


def _queryset_produtos_disponiveis():
    hoje = timezone.localdate()

    lotes_disponiveis = (
        Lot.objects.filter(
            produto_id=OuterRef("pk"),
            validade__gte=hoje,
        )
        .annotate(
            saldo_calc=F("quantidade_inicial")
            + Coalesce(
                Sum(
                    Case(
                        When(
                            movimentos__deletado=False,
                            movimentos__tipo="SAI",
                            then=-F("movimentos__quantidade"),
                        ),
                        When(
                            movimentos__deletado=False,
                            then=F("movimentos__quantidade"),
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

    return Product.objects.filter(Exists(lotes_disponiveis)).order_by("nome")


class ProcedimentoItemInline(admin.TabularInline):
    model = ProcedureItem
    extra = 1
    fields = (
        "catalogo",
        "descricao",
        "quantidade",
        "realizado",
        "observacao",
    )
    autocomplete_fields = ("catalogo",)


class ProcedimentoMaterialInline(admin.TabularInline):
    model = ProcedureMaterial
    extra = 1
    fields = (
        "procedimento_item",
        "produto",
        "quantidade",
        "lote",
        "movimento_estoque",
        "observacao",
    )
    readonly_fields = ("procedimento_item", "lote", "movimento_estoque")
    autocomplete_fields = ("produto",)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "produto":
            kwargs["queryset"] = _queryset_produtos_disponiveis()

        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class ProcedimentoCatalogoMaterialInline(admin.TabularInline):
    model = ProcedureCatalogMaterial
    extra = 1
    fields = (
        "produto",
        "quantidade_padrao",
        "custo_unitario_padrao",
        "observacao",
    )
    autocomplete_fields = ("produto",)


@admin.register(ProcedureCatalog)
class ProcedimentoCatalogoAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "preco_padrao",
        "iva_percentual",
        "aplica_iva_por_padrao",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "nome",
        "descricao",
    )
    list_filter = ("criado_em",)
    ordering = ("nome",)
    readonly_fields = (
        "id_custom",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    inlines = (ProcedimentoCatalogoMaterialInline,)
    fieldsets = (
        (
            "Procedimento do Catálogo",
            {
                "fields": (
                    "id_custom",
                    "nome",
                    "descricao",
                    "preco_padrao",
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
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )


@admin.register(ProcedureCatalogMaterial)
class ProcedimentoCatalogoMaterialAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "catalogo",
        "produto",
        "quantidade_padrao",
        "custo_unitario_padrao",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "catalogo__nome",
        "produto__nome",
    )
    list_filter = (
        "catalogo",
        "criado_em",
    )
    ordering = ("catalogo", "produto")
    autocomplete_fields = ("catalogo", "produto")
    list_select_related = ("catalogo", "produto")
    readonly_fields = (
        "id_custom",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Material Padrão",
            {
                "fields": (
                    "id_custom",
                    "catalogo",
                    "produto",
                    "quantidade_padrao",
                    "custo_unitario_padrao",
                    "observacao",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )


@admin.register(NursingRecord)
class NursingRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "paciente",
        "prioridade",
        "data_registro",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "nome",
        "paciente__nome",
    )
    list_filter = (
        "prioridade",
        "data_registro",
    )
    autocomplete_fields = ("paciente",)
    list_select_related = ("paciente",)
    ordering = ("-data_registro",)
    readonly_fields = (
        "id_custom",
        "data_registro",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Registro de Enfermagem",
            {
                "fields": (
                    "id_custom",
                    "nome",
                    "paciente",
                    "prioridade",
                    "observacao",
                    "data_registro",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )


@admin.register(Procedure)
class ProcedimentoAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "paciente",
        "profissional",
        "data_realizacao",
        "itens_total",
        "materiais_total",
        "total",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "paciente__nome",
        "observacoes",
    )
    list_filter = (
        "data_realizacao",
        "criado_em",
    )
    autocomplete_fields = (
        "paciente",
        "profissional",
    )
    list_select_related = ("paciente", "profissional")
    ordering = ("-data_realizacao",)
    readonly_fields = (
        "id_custom",
        "subtotal_servicos",
        "subtotal_materiais",
        "total",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    inlines = (ProcedimentoItemInline, ProcedimentoMaterialInline)
    fieldsets = (
        (
            "Procedimento",
            {
                "fields": (
                    "id_custom",
                    "inquilino",
                    "paciente",
                    "profissional",
                    "data_realizacao",
                    "observacoes",
                    "subtotal_servicos",
                    "subtotal_materiais",
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
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
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
        "id_custom",
        "procedimento",
        "catalogo",
        "descricao",
        "quantidade",
        "realizado",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "catalogo__nome",
        "descricao",
        "procedimento__id_custom",
        "procedimento__paciente__nome",
    )
    list_filter = ("realizado", "criado_em")
    autocomplete_fields = ("procedimento", "catalogo")
    list_select_related = ("procedimento", "procedimento__paciente", "catalogo")
    ordering = ("-criado_em",)
    readonly_fields = (
        "id_custom",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Item de Procedimento",
            {
                "fields": (
                    "id_custom",
                    "procedimento",
                    "catalogo",
                    "descricao",
                    "quantidade",
                    "realizado",
                    "observacao",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )


@admin.register(ProcedureMaterial)
class ProcedimentoMaterialAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "procedimento",
        "procedimento_item",
        "produto",
        "lote",
        "quantidade",
        "movimento_estoque",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "produto__nome",
        "lote__numero_lote",
        "procedimento__id_custom",
        "procedimento__paciente__nome",
        "procedimento_item__id_custom",
    )
    list_filter = ("criado_em", "produto")
    autocomplete_fields = (
        "procedimento",
        "procedimento_item",
        "produto",
    )
    list_select_related = (
        "procedimento",
        "procedimento_item",
        "produto",
        "lote",
        "movimento_estoque",
    )
    ordering = ("-criado_em",)
    readonly_fields = (
        "id_custom",
        "lote",
        "movimento_estoque",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Material do Procedimento",
            {
                "fields": (
                    "id_custom",
                    "procedimento",
                    "procedimento_item",
                    "produto",
                    "lote",
                    "quantidade",
                    "movimento_estoque",
                    "observacao",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "produto":
            kwargs["queryset"] = _queryset_produtos_disponiveis()

        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ProcedureItemValue)
class ProcedureItemValueAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "item",
        "preco_unitario",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "item__id_custom",
        "item__descricao",
        "item__procedimento__id_custom",
    )
    list_filter = ("criado_em",)
    autocomplete_fields = ("item",)
    list_select_related = ("item", "item__procedimento")
    ordering = ("-criado_em",)
    readonly_fields = (
        "id_custom",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Valor do Item",
            {
                "fields": (
                    "id_custom",
                    "item",
                    "preco_unitario",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )


@admin.register(ProcedureMaterialValue)
class ProcedureMaterialValueAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "material",
        "custo_unitario",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "material__id_custom",
        "material__produto__nome",
        "material__procedimento__id_custom",
    )
    list_filter = ("criado_em",)
    autocomplete_fields = ("material",)
    list_select_related = ("material", "material__procedimento", "material__produto")
    ordering = ("-criado_em",)
    readonly_fields = (
        "id_custom",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Valor do Material",
            {
                "fields": (
                    "id_custom",
                    "material",
                    "custo_unitario",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )


@admin.register(NursingVitalSign)
class SinalVitalEnfermagemAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "registro",
        "temperatura_c",
        "frequencia_cardiaca",
        "saturacao_oxigenio",
        "coletado_em",
    )
    search_fields = (
        "id_custom",
        "nome",
        "registro__paciente__nome",
    )
    list_filter = ("coletado_em",)
    autocomplete_fields = ("registro",)
    list_select_related = ("registro", "registro__paciente")
    ordering = ("-coletado_em",)
    readonly_fields = (
        "id_custom",
        "coletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Sinais Vitais",
            {
                "fields": (
                    "id_custom",
                    "nome",
                    "registro",
                    "temperatura_c",
                    "frequencia_cardiaca",
                    "frequencia_respiratoria",
                    "saturacao_oxigenio",
                    "pressao_arterial",
                    "coletado_em",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )


RegistroEnfermagemAdmin = NursingRecordAdmin
ProcedimentoItemValorAdmin = ProcedureItemValueAdmin
ProcedimentoMaterialValorAdmin = ProcedureMaterialValueAdmin
