from rest_framework import serializers

from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification


class DeliveryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryLog
        fields = "__all__"


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"


SERIALIZER_MAP = {
    "logenvio": DeliveryLogSerializer,
    "notification": NotificationSerializer,
}

LogEnvioSerializer = DeliveryLogSerializer
NotificacaoSerializer = NotificationSerializer
