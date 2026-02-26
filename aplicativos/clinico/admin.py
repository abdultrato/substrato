from django.contrib import admin
from .modelos.paciente import Paciente
from .modelos.exame import Exame
from .modelos.exame_campo import ExameCampo,
from .modelos.requisicao_analise import RequisicaoAnalise
from .modelos.
    RequisicaoItem,
    ResultadoItem,
)


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
    list_display = ("nome", "codigo", "ativo")
    search_fields = ("nome", "codigo")
    inlines = [ExameCampoInline]


# =========================================================
# REQUISIÇÃO
# =========================================================
class RequisicaoItemInline(admin.TabularInline):
    model = RequisicaoItem
    extra = 0


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
