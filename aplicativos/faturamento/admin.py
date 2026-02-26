from django.contrib import admin

from .modelos.fatura import Fatura
from  .modelos.fatura_itens import FaturaItem


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("ativo", "deletado")
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


class FaturaItemInline(admin.TabularInline):
    model = FaturaItem
    extra = 0


@admin.register(Fatura)
class FaturaAdmin(CoreAdmin):
    list_display = ("id_custom", "requisicao", "total", "estado")
    search_fields = ("id_custom", "requisicao__paciente__nome")
    inlines = [FaturaItemInline]
