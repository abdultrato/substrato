from django.contrib import admin

from .modelos.configuracao import ConfiguracaoInquilino
from .modelos.inquilino import Inquilino


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


@admin.register(Inquilino)
class InquilinoAdmin(admin.ModelAdmin):
    list_display = ("identificador", "nome", "dominio", "ativo", "status_comercial", "trial_ate")
    list_filter = ("ativo", "status_comercial")
    search_fields = ("identificador", "nome", "dominio")
    ordering = ("identificador",)


@admin.register(ConfiguracaoInquilino)
class ConfiguracaoInquilinoAdmin(CoreAdmin):
    list_display = (
        "inquilino",
        "fuso_horario",
        "moeda",
        "idioma",
        "acrescimo_percentual_consulta_feriado",
    )
    list_filter = ("moeda", "idioma")
    search_fields = ("inquilino__nome", "inquilino__identificador")
