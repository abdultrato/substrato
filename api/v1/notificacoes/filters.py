import django_filters

from aplicativos.notificacoes.modelos.log_envio import LogEnvio
from aplicativos.notificacoes.modelos.notificacao import Notificacao

class LogEnvioFilter(django_filters.FilterSet):
    class Meta:
        model = LogEnvio
        fields = ['notificacao', 'status', 'resposta', 'criado_em']

class NotificacaoFilter(django_filters.FilterSet):
    class Meta:
        model = Notificacao
        fields = ['destinatario', 'canal', 'mensagem', 'enviada', 'criado_em']

FILTER_MAP = {
    'logenvio': LogEnvioFilter,
    'notificacao': NotificacaoFilter,
}
