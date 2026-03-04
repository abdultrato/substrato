from django.contrib import admin

from .modelos.log_envio import LogEnvio
from .modelos.notificacao import Notificacao
from .modelos.template import TemplateNotificacao

admin.site.register(Notificacao)
admin.site.register(TemplateNotificacao)
admin.site.register(LogEnvio)