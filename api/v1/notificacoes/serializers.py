from rest_framework import serializers

from aplicativos.notificacoes.modelos.log_envio import LogEnvio
from aplicativos.notificacoes.modelos.notificacao import Notificacao


class LogEnvioSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogEnvio
        fields = "__all__"


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = "__all__"


SERIALIZER_MAP = {
    "logenvio": LogEnvioSerializer,
    "notificacao": NotificacaoSerializer,
}
