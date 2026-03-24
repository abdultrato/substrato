from django.contrib import admin

from .models.company import Company


@admin.register(Company)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "nuit",
        "telefone1",
        "email",
        "ativo",
        "criado_em",
    )
    list_filter = ("ativo",)
    search_fields = ("id_custom", "nome", "nuit", "telefone1", "email")
    ordering = ("nome",)
