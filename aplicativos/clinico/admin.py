from django.contrib import admin
from .modelos.paciente import Paciente
from .modelos.exame import Exame
from .modelos.exame_campo import ExameCampo
from .modelos.requisicao_analise import RequisicaoAnalise
from .modelos.requisicao_analise_item import RequisicaoItem
from .modelos.resultado_analise import ResultadoItem


# =========================================================
# BASE ADMIN
# =========================================================
class CoreAdmin(admin.ModelAdmin):
    list_filter = ("ativo", "deletado")
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


# =========================================================
# PACIENTE
# =========================================================
@admin.register(Paciente)
class PacienteAdmin(CoreAdmin):
    list_display = ("nome", "numero_id", "contacto", "ativo")
    search_fields = ("nome", "numero_id", "contacto")


# =========================================================
# EXAME
# =========================================================
class ExameCampoInline(admin.TabularInline):
    model = ExameCampo
    extra = 0


@admin.register(Exame)
class ExameAdmin(CoreAdmin):
    list_display = ("nome", "ativo")
    search_fields = ("nome", "id_custom")
    inlines = [ExameCampoInline]


# =========================================================
# REQUISIÇÃO
# =========================================================
class RequisicaoItemInline(admin.TabularInline):
    model = RequisicaoItem
    extra = 1


@admin.register(RequisicaoItem)
class RequisicaoAdmin(admin.ModelAdmin):
    inlines = [RequisicaoItemInline]

@admin.register(RequisicaoAnalise)
class RequisicaoAdmin(CoreAdmin):
    list_display = ("id_custom", "paciente", "status", "criado_em")
    search_fields = ("id_custom", "paciente__nome")
    inlines = [RequisicaoItemInline]
    filter_horizontal = ("exames",)


# =========================================================
# RESULTADOS
# =========================================================
@admin.register(ResultadoItem)
class ResultadoAdmin(CoreAdmin):
    list_display = ("id_custom", "exame_campo", "validado")
    list_filter = ("validado",)
    search_fields = ("id_custom",)
