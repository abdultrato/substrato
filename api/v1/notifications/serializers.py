from rest_framework import serializers

from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification


class LogEnvioSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryLog
        fields = "__all__"


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"


SERIALIZER_MAP = {
    "logenvio": LogEnvioSerializer,
    "notificacao": NotificacaoSerializer,
}
