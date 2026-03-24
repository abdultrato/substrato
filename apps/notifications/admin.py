from django.contrib import admin

from .models.delivery_log import DeliveryLog
from .models.notification import Notification
from .models.notification_template import NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
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


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ("nome", "criado_em")
    search_fields = ("nome", "conteudo")
    readonly_fields = ("criado_em",)
    ordering = ("nome",)


@admin.register(DeliveryLog)
class DeliveryLogAdmin(admin.ModelAdmin):
    list_display = ("id", "notificacao", "status", "criado_em")
    list_filter = ("status", "criado_em")
    search_fields = ("notificacao__destinatario", "status", "resposta")
    readonly_fields = ("criado_em",)
    ordering = ("-criado_em",)


NotificacaoAdmin = NotificationAdmin
TemplateNotificacaoAdmin = NotificationTemplateAdmin
LogEnvioAdmin = DeliveryLogAdmin
