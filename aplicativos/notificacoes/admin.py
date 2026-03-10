from django.contrib import admin

from .modelos.log_envio import LogEnvio
from .modelos.notificacao import Notificacao
from .modelos.template import TemplateNotificacao


@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "tipo_evento",
        "canal",
        "destinatario",
        "paciente",
        "enviada",
        "enviado_em",
        "criado_em",
    )
    list_filter = ("tipo_evento", "canal", "enviada", "criado_em")
    search_fields = (
        "destinatario",
        "assunto",
        "mensagem",
        "referencia_externa",
        "paciente__nome",
        "paciente__id_custom",
    )
    readonly_fields = ("criado_em", "enviado_em")
    ordering = ("-criado_em",)


@admin.register(TemplateNotificacao)
class TemplateNotificacaoAdmin(admin.ModelAdmin):
    list_display = ("nome", "criado_em")
    search_fields = ("nome", "conteudo")
    readonly_fields = ("criado_em",)
    ordering = ("nome",)


@admin.register(LogEnvio)
class LogEnvioAdmin(admin.ModelAdmin):
    list_display = ("id", "notificacao", "status", "criado_em")
    list_filter = ("status", "criado_em")
    search_fields = ("notificacao__destinatario", "status", "resposta")
    readonly_fields = ("criado_em",)
    ordering = ("-criado_em",)
