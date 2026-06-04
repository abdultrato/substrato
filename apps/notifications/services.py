from django.conf import settings
from django.utils import timezone

from .channels.email import EmailChannel
from .channels.sms import SMSChannel
from .channels.whatsapp import WhatsAppChannel
from .exceptions import DeliveryFailure
from .models.delivery_log import DeliveryLog
from .models.notification import Notification

CHANNELS = {
    Notification.Channel.EMAIL: EmailChannel(),
    Notification.Channel.SMS: SMSChannel(),
    Notification.Channel.WHATSAPP: WhatsAppChannel(),
}


def _first_non_empty(*values):
    for value in values:
        if value not in (None, ""):
            return value
    return None


class NotificationService:
    def _normalize_channels(self, channels=None):
        if not channels:
            channels = (Notification.Channel.EMAIL, Notification.Channel.SMS)
        elif isinstance(channels, str):
            channels = [item.strip() for item in channels.split(",")]

        normalized = []
        for channel in channels:
            channel_value = str(channel).strip().lower()
            if not channel_value or channel_value in normalized:
                continue
            normalized.append(channel_value)
        return tuple(normalized)

    def _active_channel(self, channel):
        if channel == Notification.Channel.EMAIL:
            is_active = getattr(settings, "NOTIFICACOES_EMAIL_ATIVAS", True)
            return (is_active, "Canal de e-mail desativado por configuração.")

        if channel == Notification.Channel.SMS:
            is_active = getattr(settings, "NOTIFICACOES_SMS_ATIVAS", False)
            if not is_active:
                return (False, "Canal de SMS desativado por configuração.")

            if not getattr(settings, "SMS_API_URL", "") or not getattr(settings, "SMS_API_KEY", ""):
                return (False, "Credenciais de SMS não configuradas.")

            return (True, "")

        if channel == Notification.Channel.WHATSAPP:
            is_active = getattr(settings, "NOTIFICACOES_WHATSAPP_ATIVAS", False)
            if not is_active:
                return (False, "Canal de WhatsApp desativado por configuração.")

            if not getattr(settings, "WHATSAPP_API_URL", "") or not getattr(settings, "WHATSAPP_API_KEY", ""):
                return (False, "Credenciais de WhatsApp não configuradas.")

            return (True, "")

        return (True, "")

    def _get_existing(self, channel, event_type, external_reference, destination):
        if not external_reference:
            return None

        return (
            Notification.objects.filter(
                channel=channel,
                event_type=event_type,
                external_reference=external_reference,
                recipient=destination,
                sent=True,
            )
            .order_by("-id")
            .first()
        )

    def send(
        self,
        destination,
        message,
        channel,
        subject="Notificação",
        patient=None,
        event_type=Notification.EventType.GENERICA,
        external_reference="",
        raise_exception=False,
        **kwargs,
    ):
        legacy_external_reference = kwargs.pop("referencia_externa", "")
        if not external_reference and legacy_external_reference:
            external_reference = legacy_external_reference

        if not destination:
            raise ValueError("Destino da notificação é obrigatório.")
        if channel not in CHANNELS:
            raise ValueError(f"Canal inválido: {channel}")

        existing = self._get_existing(
            channel=channel,
            event_type=event_type,
            external_reference=external_reference,
            destination=destination,
        )
        if existing:
            return existing

        notification = Notification.objects.create(
            patient=patient,
            recipient=destination,
            channel=channel,
            subject=subject or "",
            event_type=event_type,
            external_reference=external_reference or "",
            message=message,
        )

        channel_active, inactive_reason = self._active_channel(channel)
        if not channel_active:
            DeliveryLog.objects.create(
                notification=notification,
                status="ignorado",
                response=inactive_reason,
            )
            return notification

        try:
            response = CHANNELS[channel].send(
                destination=destination,
                message=message,
                subject=subject,
            )
            notification.sent = True
            notification.sent_at = timezone.now()
            notification.send_error = ""
            notification.save(update_fields=["sent", "sent_at", "send_error"])

            DeliveryLog.objects.create(
                notification=notification,
                status="sucesso",
                response=str(response),
            )
        except Exception as error:
            notification.send_error = str(error)
            notification.save(update_fields=["send_error"])
            DeliveryLog.objects.create(
                notification=notification,
                status="error",
                response=str(error),
            )
            if raise_exception:
                raise DeliveryFailure(str(error)) from error

        return notification

    def send_to_patient(
        self,
        patient,
        message,
        subject="Notificação",
        event_type=Notification.EventType.GENERICA,
        external_reference="",
        channels=None,
        email=None,
        phone=None,
        **kwargs,
    ):
        legacy_external_reference = kwargs.pop("referencia_externa", "")
        if not external_reference and legacy_external_reference:
            external_reference = legacy_external_reference

        if not patient:
            return []

        notifications = []

        related_patient = patient if hasattr(patient, "_meta") else None
        email = (
            _first_non_empty(
                email,
                kwargs.pop("recipient_email", None),
                kwargs.pop("destinatario_email", None),
                kwargs.pop("email_acompanhante", None),
                kwargs.pop("companion_email", None),
                getattr(patient, "email", None),
                getattr(patient, "companion_email", None),
            )
        )
        phone = (
            _first_non_empty(
                phone,
                kwargs.pop("recipient_phone", None),
                kwargs.pop("destinatario_telefone", None),
                kwargs.pop("telefone", None),
                kwargs.pop("contacto", None),
                kwargs.pop("contato", None),
                kwargs.pop("telefone_acompanhante", None),
                kwargs.pop("contacto_acompanhante", None),
                kwargs.pop("contato_acompanhante", None),
                kwargs.pop("companion_phone", None),
                kwargs.pop("companion_contact", None),
                getattr(patient, "contact", None),
                getattr(patient, "contacto", None),
                getattr(patient, "companion_contact", None),
                getattr(patient, "companion_phone", None),
            )
        )
        requested_channels = self._normalize_channels(channels or kwargs.pop("canais", None))
        seen_destinations = set()

        if Notification.Channel.EMAIL in requested_channels and email:
            destination_key = (Notification.Channel.EMAIL, str(email))
            seen_destinations.add(destination_key)
            notifications.append(
                self.send(
                    destination=str(email),
                    message=message,
                    channel=Notification.Channel.EMAIL,
                    subject=subject,
                    patient=related_patient,
                    event_type=event_type,
                    external_reference=external_reference,
                )
            )

        for channel in (Notification.Channel.SMS, Notification.Channel.WHATSAPP):
            if channel not in requested_channels or not phone:
                continue
            destination = str(phone)
            destination_key = (channel, destination)
            if destination_key in seen_destinations:
                continue
            seen_destinations.add(destination_key)
            notifications.append(
                self.send(
                    destination=destination,
                    message=message,
                    channel=channel,
                    subject=subject,
                    patient=related_patient,
                    event_type=event_type,
                    external_reference=external_reference,
                )
            )

        return notifications

    def _legacy_active_channel(self, channel):
        return self._active_channel(channel=channel)

    def _legacy_get_existing(self, channel, event_type, external_reference, destino):
        return self._get_existing(
            channel=channel,
            event_type=event_type,
            external_reference=external_reference,
            destination=destino,
        )

    def _legacy_send(
        self,
        destino,
        message,
        channel,
        subject="Notificação",
        patient=None,
        event_type=Notification.TipoEvento.GENERICA,
        external_reference="",
        levantar_excecao=False,
    ):
        return self.send(
            destination=destino,
            message=message,
            channel=channel,
            subject=subject,
            patient=patient,
            event_type=event_type,
            external_reference=external_reference,
            raise_exception=levantar_excecao,
        )

    def _legacy_send_to_patient(
        self,
        patient,
        message,
        subject="Notificação",
        event_type=Notification.TipoEvento.GENERICA,
        external_reference="",
    ):
        return self.send_to_patient(
            patient=patient,
            message=message,
            subject=subject,
            event_type=event_type,
            external_reference=external_reference,
        )
