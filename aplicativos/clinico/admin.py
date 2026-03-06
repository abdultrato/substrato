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
	list_display = ("id_custom", "nome", "exame", "tipo", "unidade", "referencia",)
	search_fields = ("id_custom", "nome", "exame__nome",)
	
	autocomplete_fields = ("exame",)
	
	list_select_related = ("exame",)
	
	def referencia(self, obj) :
		if obj.referencia_min and obj.referencia_max :
			return f"{obj.referencia_min} - {obj.referencia_max}"
		
		return "-"
	
	referencia.short_description = "Referência"


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
	
	inlines = (ExameCampoInline,)


# =========================================================
# REQUISIÇÃO
# =========================================================

class RequisicaoItemInline(admin.TabularInline) :
	model = RequisicaoItem
	extra = 1
	
	autocomplete_fields = ("exame",)


@admin.register(RequisicaoAnalise)
class RequisicaoAnaliseAdmin(CoreAdmin) :
	list_display = ("id_custom", "paciente", "estado", "status_clinico", "lancar_resultado", "ver_pdf_resultado", "criado_em",)
	
	search_fields = ("id_custom", "paciente__nome",)
	
	list_filter = ("status_clinico",)
	
	autocomplete_fields = ("paciente", "analista",)
	
	list_select_related = ("paciente", "analista",)
	
	inlines = (RequisicaoItemInline,)
	
	# -----------------------------------------------------
	
	def lancar_resultado(self, obj) :
		resultado = obj.obter_ou_criar_resultado()
		
		url = reverse("admin:clinico_resultado_change", args = [resultado.id], )
		
		return format_html('<a class="button" href="{}">Lançar resultados</a>', url, )
	
	lancar_resultado.short_description = "Resultados"
	
	# -----------------------------------------------------
	
	def ver_pdf_resultado(self, obj) :
		if not hasattr(obj, "resultado") :
			return format_html('<span style="color:gray;">Sem resultados</span>')
		
		resultado = obj.resultado
		itens = resultado.itens.all()
		
		if not itens.exists() :
			return format_html('<span style="color:gray;">Sem resultados</span>')
		
		if itens.filter(alerta_critico = True).exists() :
			cor = "#c0392b"
			texto = "PDF Crítico"
		
		elif itens.filter(estado = "VALIDADO").count() != itens.count() :
			cor = "#e67e22"
			texto = "PDF Parcial"
		
		else :
			cor = "#27ae60"
			texto = "PDF Final"
		
		url = reverse("resultado_pdf", args = [obj.id_custom], )
		
		return format_html('<a style="background:{};color:white;padding:4px 10px;border-radius:4px;text-decoration:none;" target="_blank" href="{}">{}</a>', cor, url, texto, )
	
	ver_pdf_resultado.short_description = "Resultado PDF"


# =========================================================
# RESULTADO ITEM INLINE
# =========================================================

class ResultadoItemInline(admin.TabularInline) :
	model = ResultadoItem
	formset = ResultadoItemInlineFormSet
	
	extra = 0
	
	fields = ("exame_nome", "exame_campo", "resultado_valor", "resultado_colorido", "interpretacao", "referencia", "estado",)
	
	readonly_fields = ("exame_nome", "resultado_colorido", "interpretacao", "referencia",)
	
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
	
	# -----------------------------------------------------
	
	def referencia(self, obj) :
		if not obj.exame_campo :
			return "-"
		
		return f"{obj.exame_campo.referencia_min} - {obj.exame_campo.referencia_max}"
	
	referencia.short_description = "Referência"
	
	# -----------------------------------------------------
	
	def interpretacao(self, obj) :
		if not obj.status_clinico :
			return "-"
		
		cores = {"NORMAL" : "#2c3e50", "BAIXO" : "#2980b9", "ALTO" : "#e74c3c", "CRITICO_BAIXO" : "#c0392b", "CRITICO_ALTO" : "#c0392b", }
		
		cor = cores.get(obj.status_clinico, "#2c3e50")
		
		return format_html("<strong style='color:{}'>{}</strong>", cor, obj.status_clinico, )
	
	interpretacao.short_description = "Interpretação"
	
	# -----------------------------------------------------
	
	def resultado_colorido(self, obj) :
		cor = obj.cor_laudo or "#2c3e50"
		
		return format_html("<strong style='color:{}'>{}</strong>", cor, obj.resultado_valor or "-", )
	
	resultado_colorido.short_description = "Resultado"


# =========================================================
# RESULTADO
# =========================================================

@admin.register(Resultado)
class ResultadoAdmin(CoreAdmin) :
	list_display = ("id_custom", "requisicao", "analista", "finalizado", "criado_em",)
	
	list_select_related = ("requisicao", "analista",)
	
	raw_id_fields = ("requisicao", "analista",)
	readonly_fields = ("id_custom", "requisicao", "analista", "criado_em",)
	inlines = (ResultadoItemInline,)