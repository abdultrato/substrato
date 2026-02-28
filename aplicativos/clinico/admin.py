from django.contrib import admin

from .modelos.paciente import Paciente
from .modelos.exame import Exame
from .modelos.exame_campo import ExameCampo
from .modelos.requisicao_analise import RequisicaoAnalise
from .modelos.requisicao_analise_item import RequisicaoItem
from .modelos.resultado_analise import ResultadoItem


# =========================================================
# BASE ADMIN CORPORATIVO
# =========================================================
class CoreAdmin(admin.ModelAdmin):
    list_filter = ("ativo", "deletado")
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)
    list_per_page = 50


# =========================================================
# PACIENTE
# =========================================================
@admin.register(Paciente)
class PacienteAdmin(CoreAdmin):
    list_display = ("nome", "numero_id", "contacto", "ativo")
    search_fields = ("nome", "numero_id", "contacto")
    autocomplete_fields = ()

@admin.register(ExameCampo)
class ExameCampoAdmin(CoreAdmin):
    list_display = ("id_custom", "nome", "exame", "ativo")
    search_fields = ("id_custom", "nome", "exame__nome")
    autocomplete_fields = ("exame",)

# =========================================================
# EXAME
# =========================================================
class ExameCampoInline(admin.TabularInline):
    model = ExameCampo
    extra = 0


@admin.register(Exame)
class ExameAdmin(CoreAdmin):
    list_display = ("id_custom", "nome", "ativo")
    search_fields = ("id_custom", "nome")
    inlines = [ExameCampoInline]


# =========================================================
# REQUISIÇÃO (AGREGADO RAIZ)
# =========================================================
class RequisicaoItemInline(admin.TabularInline):
    model = RequisicaoItem
    extra = 1
    autocomplete_fields = ("exame",)


@admin.register(RequisicaoAnalise)
class RequisicaoAnaliseAdmin(CoreAdmin):
    list_display = ("id_custom", "paciente", "status", "status_clinico", "criado_em")
    search_fields = ("id_custom", "paciente__nome")
    list_filter = ("status", "status_clinico", "ativo")
    autocomplete_fields = ("paciente", "analista")
    inlines = [RequisicaoItemInline]


# =========================================================
# RESULTADOS
# =========================================================
@admin.register(ResultadoItem)
class ResultadoAdmin(CoreAdmin):
    list_display = ("id_custom", "exame_campo", "validado")
    list_filter = ("validado",)
    search_fields = ("id_custom",)
    autocomplete_fields = ("exame_campo",)
