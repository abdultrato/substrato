"""Configuração do Django Admin para entidades externas/internas."""

from django.contrib import admin

from .models.company import Company


@admin.register(Company)
class EmpresaAdmin(admin.ModelAdmin):
    """Administra empresas com filtros de atividade e busca por NUIT/contato."""
    list_display = (  # Colunas visíveis no changelist
        "custom_id",
        "name",
        "nuit",
        "phone1",
        "email",
        "active",
        "created_at",
    )
    list_filter = ("active",)  # Filtro rápido por status
    search_fields = ("custom_id", "name", "nuit", "phone1", "email")  # Barra de busca
    ordering = ("name",)  # Ordenação consistente
