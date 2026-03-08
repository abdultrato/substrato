from django.contrib import admin
from django.utils.html import format_html

from .modelos.configuracao import ConfiguracaoInquilino
from .modelos.inquilino import Inquilino
from .modelos.uso_tenant import UsoTenant


# ===============================
# Inline Uso
# ===============================

class UsoInline(admin.StackedInline) :
	model = UsoTenant
	extra = 0
	can_delete = False
	readonly_fields = ("usuarios_ativos", "requisicoes_mes_atual")


# ===============================
# Inline Config
# ===============================

class ConfigInline(admin.StackedInline) :
	model = ConfiguracaoInquilino
	extra = 0
	can_delete = False


# ===============================
# Admin Principal
# ===============================

@admin.register(Inquilino)
class InquilinoAdmin(admin.ModelAdmin) :
	list_display = ("nome", "identificador", "usuarios_ativos", "uso_requisicoes", "status",)
	readonly_fields = ("versao", "criado_em", "criado_por", "criado_por_id", "deletado_em", "deletado_por", "atualizado_por", "atualizado_em", "deletado_por_id")
	
	list_filter = ("ativo",)
	
	search_fields = ("nome", "identificador")
	
	inlines = [ConfigInline,
		
		UsoInline, ]
	
	# ---------------------------------
	# Performance
	# ---------------------------------
	
	def get_queryset(self, request) :
		return (super().get_queryset(request).select_related("uso", "configuracao"))
	
	# ---------------------------------
	# Colunas calculadas
	# ---------------------------------
	
	@admin.display(description = "Plano")
	def tipo_plano(self, obj) :
		try :
			plano = obj.obter_plano_atual()
			if plano :
				return plano.tipo
		except Exception :
			return "-"
		return "-"
	
	@admin.display(description = "Usuários")
	def usuarios_ativos(self, obj) :
		try :
			if hasattr(obj, "uso") :
				return obj.uso.usuarios_ativos
		except Exception :
			return "-"
		return 0
	
	@admin.display(description = "Uso Req.")
	def uso_requisicoes(self, obj) :
		try :
			if hasattr(obj, "uso") and obj.obter_plano_atual() :
				percentual = obj.uso.percentual_uso_requisicoes()
				
				cor = "green"
				if percentual > 80 :
					cor = "orange"
				if percentual > 100 :
					cor = "red"
				
				return format_html('<b style="color:{};">{:.1f}%</b>', cor, percentual, )
		except Exception :
			return "-"
		return "-"
	
	@admin.display(description = "Status")
	def status(self, obj) :
		if obj.ativo :
			return format_html('<span style="color:{};">{} {}</span>', "green", "●", "Ativo")
		return format_html('<span style="color:{};">{} {}</span>', "red", "●", "Inativo")
	
	# ---------------------------------
	# Segurança
	# ---------------------------------
	
	def has_delete_permission(self, request, obj = None) :
		return request.user.is_superuser