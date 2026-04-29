"""Configuração do admin para Cirurgias e procedimentos cirúrgicos."""

from django.contrib import admin

from .models.surgery import LargeSurgery, SmallSurgery, Surgery
from .models.surgical_procedure import SurgicalProcedure


class CoreAdmin(admin.ModelAdmin):
    """Base admin com filtros padrões e auditoria read-only."""
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


class BaseCirurgiaAdmin(CoreAdmin):
    """Base compartilhada para pequenas e grandes cirurgias."""
    list_display = (
        "scheduled_for",
        "patient",
        "surgeon",
        "procedures_lista",
        "estimated_price",
        "vat_percentage",
        "surgery_size",
        "status",
    )
    list_filter = ("surgery_size", "status")
    search_fields = ("procedure", "patient__name", "surgeon__username", "procedures__name")
    ordering = ("-scheduled_for", "-created_at")
    filter_horizontal = ("procedures",)
    autocomplete_fields = ("patient", "surgeon", "procedures")

    def procedures_lista(self, obj):
        """Lista resumida de procedimentos associados (fallback para texto livre)."""
        nomes = list(obj.procedures.values_list("name", flat=True)[:3])
        if not nomes and (obj.procedure or "").strip():
            return obj.procedure
        if len(nomes) == 3 and obj.procedures.count() > 3:
            return ", ".join(nomes) + "..."
        return ", ".join(nomes) if nomes else "-"

    procedures_lista.short_description = "Procedimentos"


@admin.register(SmallSurgery)
class PequenaCirurgiaAdmin(BaseCirurgiaAdmin):
    """Administra pequenas cirurgias."""


@admin.register(LargeSurgery)
class GrandeCirurgiaAdmin(BaseCirurgiaAdmin):
    """Administra grandes cirurgias."""


@admin.register(Surgery)
class CirurgiaAdmin(BaseCirurgiaAdmin):
    """Administra todas as cirurgias (visão consolidada)."""


@admin.register(SurgicalProcedure)
class ProcedimentoCirurgicoAdmin(CoreAdmin):
    """Catálogo de procedimentos cirúrgicos."""
    list_display = ("name", "base_price", "vat_percentage", "applies_vat_by_default", "active", "created_at")
    list_filter = ("active", "deleted")
    search_fields = ("name", "description", "custom_id")
    ordering = ("name",)
