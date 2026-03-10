from django.contrib import admin
from django.utils.html import format_html

from .modelos.autorizacao import AutorizacaoProcedimento
from .modelos.plano_cobertura import PlanoCobertura
from .modelos.seguradora import Seguradora


# =====================================================
# SEGURADORA
# =====================================================

@admin.register(Seguradora)
class SeguradoraAdmin(admin.ModelAdmin) :
	list_display = ("id_custom", "nome", "ativa", "criado_em",)
	
	search_fields = ("nome", "id_custom", "codigo_externo")
	list_filter = ("ativa", "criado_em")
	ordering = ("nome",)
	
	readonly_fields = ("id_custom", "criado_em", "atualizado_em",)
	
	fieldsets = (("Informações Gerais", {"fields" : ("id_custom", "nome", "ativa",)}), ("Contato", {"fields" : ("email", "telefone",)}), ("Auditoria", {"fields" : ("criado_em", "atualizado_em", "criado_por", "atualizado_por",)}),)


# =====================================================
# PLANO COBERTURA
# =====================================================

@admin.register(PlanoCobertura)
class PlanoCoberturaAdmin(admin.ModelAdmin) :
	list_display = ("id_custom", "nome", "seguradora", "percentual_cobertura", "exige_autorizacao", "criado_em",)
	
	search_fields = ("nome", "seguradora__nome", "id_custom",)
	
	list_filter = ("seguradora", "exige_autorizacao", "criado_em",)
	
	readonly_fields = ("id_custom", "criado_em", "atualizado_em",)
	
	autocomplete_fields = ("seguradora",)
	
	fieldsets = (("Informações do Plano", {"fields" : ("id_custom", "nome", "seguradora", "percentual_cobertura", "exige_autorizacao",)}), ("Auditoria", {"fields" : ("criado_em", "atualizado_em", "criado_por", "atualizado_por",)}),)


# =====================================================
# AUTORIZAÇÃO
# =====================================================

@admin.register(AutorizacaoProcedimento)
class AutorizacaoProcedimentoAdmin(admin.ModelAdmin) :
	list_display = ("id_custom", "requisicao_id", "plano", "status_colorido", "data_resposta",)
	
	list_filter = ("status", "plano__seguradora",)
	
	search_fields = ("id_custom", "requisicao_id", "codigo_autorizacao",)
	
	readonly_fields = ("id_custom", "status", "codigo_autorizacao", "data_resposta", "criado_em", "atualizado_em",)
	
	autocomplete_fields = ("plano",)
	
	fieldsets = (("Autorização", {"fields" : ("id_custom", "requisicao_id", "plano", "status", "codigo_autorizacao", "data_resposta",)}), ("Auditoria", {"fields" : ("criado_em", "atualizado_em", "criado_por", "atualizado_por",)}),)
	
	def status_colorido(self, obj) :
		colors = {"PENDENTE" : "orange", "APROVADA" : "green", "NEGADA" : "red", }
		return format_html('<b style="color:{};">{}</b>', colors.get(obj.status, "black"), obj.status, )
	
	status_colorido.short_description = "Status"
