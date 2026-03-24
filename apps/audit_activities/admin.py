from django.contrib import admin

from .models.user_activity import UserActivity


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


@admin.register(UserActivity)
class AtividadeUsuarioAdmin(CoreAdmin):
    list_display = (
        "criado_em",
        "usuario",
        "metodo",
        "caminho",
        "status_code",
        "duracao_ms",
        "view_basename",
        "view_action",
    )
    list_filter = ("metodo", "status_code", "view_basename")
    search_fields = ("caminho", "path_completo", "usuario__username", "mensagem")
    ordering = ("-criado_em", "-id")
