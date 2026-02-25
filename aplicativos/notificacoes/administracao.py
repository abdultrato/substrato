from django.contrib import admin
from .modelos.notificacao import Notificacao
from .modelos.template import TemplateNotificacao
from .modelos.log_envio import LogEnvio

admin.site.register(Notificacao)
admin.site.register(TemplateNotificacao)
admin.site.register(LogEnvio)
