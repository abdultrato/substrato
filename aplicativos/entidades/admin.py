from django.contrib import admin

from .modelos.empresa import Empresa


@admin.register(Empresa)
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

