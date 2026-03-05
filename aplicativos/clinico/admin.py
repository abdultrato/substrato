from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html

from .forms_admin import ResultadoItemInlineFormSet
from .modelos.exame import Exame
from .modelos.exame_campo import ExameCampo
from .modelos.paciente import Paciente
from .modelos.requisicao_analise import RequisicaoAnalise
from .modelos.requisicao_item import RequisicaoItem
from .modelos.resultado import Resultado
from .modelos.resultado_analise import ResultadoItem


# =========================================================
# BASE ADMIN
# =========================================================

class CoreAdmin(admin.ModelAdmin) :
	search_fields = ("id_custom",)
	readonly_fields = ("criado_em", "atualizado_em")
	ordering = ("-criado_em",)
	list_per_page = 50
	list_select_related = True


# =========================================================
# PACIENTE
# =========================================================

@admin.register(Paciente)
class PacienteAdmin(CoreAdmin) :
	list_display = ("id_custom", "nome", "numero_id", "contacto",)
	
	search_fields = ("id_custom", "nome", "numero_id", "contacto",)


# =========================================================
# EXAME CAMPO
# =========================================================

@admin.register(ExameCampo)
class ExameCampoAdmin(CoreAdmin) :
	list_display = ("id_custom", "nome", "exame", "tipo",)
	
	search_fields = ("id_custom", "nome", "exame__nome",)
	
	autocomplete_fields = ("exame",)


# =========================================================
# EXAME
# =========================================================

class ExameCampoInline(admin.TabularInline) :
	model = ExameCampo
	extra = 0


@admin.register(Exame)
class ExameAdmin(CoreAdmin) :
	list_display = ("id_custom", "nome", "setor", "metodo", "trl_horas", "preco",)
	
	search_fields = ("id_custom", "nome",)
	
	list_filter = ("setor", "metodo",)
	
	inlines = [ExameCampoInline]


# =========================================================
# REQUISIÇÃO
# =========================================================

class RequisicaoItemInline(admin.TabularInline) :
	model = RequisicaoItem
	extra = 1
	autocomplete_fields = ("exame",)


@admin.register(RequisicaoAnalise)
class RequisicaoAnaliseAdmin(CoreAdmin) :
	list_display = ("id_custom", "paciente", "estado", "status_clinico", "possui_resultado_critico", "lancar_resultado", "criado_em",)
	
	search_fields = ("id_custom", "paciente__nome",)
	
	list_filter = ("estado", "status_clinico", "possui_resultado_critico",)
	
	autocomplete_fields = ("paciente", "analista",)
	
	inlines = [RequisicaoItemInline]
	
	# -----------------------------------------------------
	
	def lancar_resultado(self, obj) :
		resultado = obj.obter_ou_criar_resultado()
		
		url = reverse("admin:clinico_resultado_change", args = [resultado.id], )
		
		return format_html('<a class="button" href="{}">Lançar resultados</a>', url, )
	
	lancar_resultado.short_description = "Resultados"


# =========================================================
# RESULTADO ITEM INLINE
# =========================================================

class ResultadoItemInline(admin.TabularInline) :
	model = ResultadoItem
	formset = ResultadoItemInlineFormSet
	
	extra = 0
	
	fields = ("exame_nome", "exame_campo", "resultado_valor", "status_clinico",)
	
	readonly_fields = ("exame_nome", "exame_campo", "status_clinico",)
	
	autocomplete_fields = ("exame_campo",)
	
	# -----------------------------------------------------
	
	def get_queryset(self, request) :
		qs = super().get_queryset(request)
		
		return qs.select_related("exame_campo", "exame_campo__exame", ).order_by("exame_campo__exame__nome", "exame_campo__nome", )
	
	# -----------------------------------------------------
	
	def exame_nome(self, obj) :
		if obj.exame_campo and obj.exame_campo.exame :
			return format_html("<b>{}</b>", obj.exame_campo.exame.nome, )
		
		return "-"
	
	exame_nome.short_description = "Exame"


# =========================================================
# RESULTADO
# =========================================================

@admin.register(Resultado)
class ResultadoAdmin(CoreAdmin) :
	list_display = ("id_custom", "requisicao", "analista", "finalizado",)
	
	raw_id_fields = ("requisicao", "analista",)
	
	inlines = [ResultadoItemInline]