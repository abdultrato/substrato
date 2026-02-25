from django.contrib import admin

from .models import (
    Entidade,
    Exame,
    ExameCampo,
    Fatura,
    FaturaItem,
    Paciente,
    RequisicaoAnalise,
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
# ENTIDADE
# =========================================================
@admin.register(Entidade)
class EntidadeAdmin(CoreAdmin):
    list_display = ("nome", "telefone1", "email", "ativo")
    search_fields = ("nome", "nuit")


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
    list_display = ("nome", "codigo", "preco", "ativo")
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


# =========================================================
# FATURA
# =========================================================
class FaturaItemInline(admin.TabularInline):
    model = FaturaItem
    extra = 0


@admin.register(Fatura)
class FaturaAdmin(CoreAdmin):
    list_display = ("id_custom", "paciente", "total", "estado")
    search_fields = ("id_custom", "paciente__nome")
    inlines = [FaturaItemInline]
