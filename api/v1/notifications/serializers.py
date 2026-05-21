from rest_framework import serializers  # DRF base

from api.v1.compat import LegacyAliasSerializerMixin
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate

CORE_READ_ONLY_FIELDS = (
    "id",
    "created_at",
)

NOTIFICATION_ALIASES = {
    "paciente": "patient",
    "patient": "patient",
    "destinatario": "recipient",
    "destinatário": "recipient",
    "recipiente": "recipient",
    "recipient": "recipient",
    "canal": "channel",
    "meio": "channel",
    "channel": "channel",
    "assunto": "subject",
    "titulo": "subject",
    "título": "subject",
    "subject": "subject",
    "tipo_evento": "event_type",
    "tipo_de_evento": "event_type",
    "evento": "event_type",
    "event": "event_type",
    "event_type": "event_type",
    "referencia_externa": "external_reference",
    "referência_externa": "external_reference",
    "referencia": "external_reference",
    "referência": "external_reference",
    "external_reference": "external_reference",
    "mensagem": "message",
    "conteudo": "message",
    "conteúdo": "message",
    "message": "message",
    "enviada": "sent",
    "enviado": "sent",
    "sent": "sent",
    "erro_envio": "send_error",
    "erro_de_envio": "send_error",
    "send_error": "send_error",
    "enviado_em": "sent_at",
    "enviada_em": "sent_at",
    "data_envio": "sent_at",
    "sent_at": "sent_at",
}

DELIVERY_LOG_ALIASES = {
    "notificacao": "notification",
    "notificação": "notification",
    "notification": "notification",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "status": "status",
    "resposta": "response",
    "retorno": "response",
    "response": "response",
}

NOTIFICATION_TEMPLATE_ALIASES = {
    "nome": "name",
    "name": "name",
    "template": "name",
    "modelo": "name",
    "conteudo": "content",
    "conteúdo": "content",
    "mensagem": "content",
    "content": "content",
}


class DeliveryLogSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = DELIVERY_LOG_ALIASES
    legacy_output_aliases = DELIVERY_LOG_ALIASES

    notification_recipient = serializers.CharField(source="notification.recipient", read_only=True)

    class Meta:
        model = DeliveryLog
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "notification_recipient")


class NotificationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = NOTIFICATION_ALIASES
    legacy_output_aliases = NOTIFICATION_ALIASES

    patient_name = serializers.CharField(source="patient.name", read_only=True)

    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name")


class NotificationTemplateSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = NOTIFICATION_TEMPLATE_ALIASES
    legacy_output_aliases = NOTIFICATION_TEMPLATE_ALIASES

    class Meta:
        model = NotificationTemplate
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "logenvio": DeliveryLogSerializer,
    "notification": NotificationSerializer,
    "template": NotificationTemplateSerializer,
}

