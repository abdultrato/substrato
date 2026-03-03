from django.contrib import admin

from .modelos.fatura import Fatura
from .modelos.fatura_itens import FaturaItem


# =====================================================
# BASE ADMIN
# =====================================================

class CoreAdmin(admin.ModelAdmin) :
	list_filter = ("deletado",)
	search_fields = ("id_custom",)
	readonly_fields = ("criado_em", "atualizado_em")
	ordering = ("-criado_em",)


# =====================================================
# FATURA ITEM INLINE
# =====================================================

class FaturaItemInline(admin.TabularInline) :
	model = FaturaItem
	extra = 0


# =====================================================
# FATURA
# =====================================================

@admin.register(Fatura)
class FaturaAdmin(CoreAdmin) :
	list_display = ("id_custom", "requisicao", "total", "estado", "criado_em",)
	
	search_fields = ("id_custom", "requisicao__paciente__nome",)
	
	list_filter = ("estado", "deletado", "criado_em",)
	
	inlines = [FaturaItemInline]