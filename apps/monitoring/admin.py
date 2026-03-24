from django.contrib import admin

from .models.system_error import SystemError


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deletado",)
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)


@admin.register(SystemError)
class SystemErrorAdmin(CoreAdmin):
    list_display = (
        "criado_em",
        "status_code",
        "exception_class",
        "caminho",
        "usuario",
    )
    list_filter = ("status_code", "exception_class")
    search_fields = ("caminho", "mensagem", "exception_class", "usuario__username")
    ordering = ("-criado_em", "-id")


ErroSistemaAdmin = SystemErrorAdmin
