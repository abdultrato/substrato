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


class NotificationService:
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
                canal=channel,
                tipo_evento=event_type,
                referencia_externa=external_reference,
                destinatario=destination,
                enviada=True,
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
    ):
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
            paciente=patient,
            destinatario=destination,
            canal=channel,
            assunto=subject or "",
            tipo_evento=event_type,
            referencia_externa=external_reference or "",
            mensagem=message,
        )

        channel_active, inactive_reason = self._active_channel(channel)
        if not channel_active:
            DeliveryLog.objects.create(
                notificacao=notification,
                status="ignorado",
                resposta=inactive_reason,
            )
            return notification

        try:
            response = CHANNELS[channel].send(
                destination=destination,
                message=message,
                subject=subject,
            )
            notification.enviada = True
            notification.enviado_em = timezone.now()
            notification.erro_envio = ""
            notification.save(update_fields=["enviada", "enviado_em", "erro_envio"])

            DeliveryLog.objects.create(
                notificacao=notification,
                status="sucesso",
                resposta=str(response),
            )
        except Exception as error:
            notification.erro_envio = str(error)
            notification.save(update_fields=["erro_envio"])
            DeliveryLog.objects.create(
                notificacao=notification,
                status="erro",
                resposta=str(error),
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
    ):
        if not patient:
            return []

        notifications = []

        related_patient = patient if hasattr(patient, "_meta") else None
        email = getattr(patient, "email", None)
        phone = getattr(patient, "contacto", None)

        if email:
            notifications.append(
                self.send(
                    destination=email,
                    message=message,
                    channel=Notification.Channel.EMAIL,
                    subject=subject,
                    patient=related_patient,
                    event_type=event_type,
                    external_reference=external_reference,
                )
            )

        if phone:
            notifications.append(
                self.send(
                    destination=str(phone),
                    message=message,
                    channel=Notification.Channel.SMS,
                    subject=subject,
                    patient=related_patient,
                    event_type=event_type,
                    external_reference=external_reference,
                )
            )

        return notifications

    def _legacy_active_channel(self, canal):
        return self._active_channel(channel=canal)

    def _legacy_get_existing(self, canal, tipo_evento, referencia_externa, destino):
        return self._get_existing(
            channel=canal,
            event_type=tipo_evento,
            external_reference=referencia_externa,
            destination=destino,
        )

    def _legacy_send(
        self,
        destino,
        mensagem,
        canal,
        assunto="Notificação",
        paciente=None,
        tipo_evento=Notification.TipoEvento.GENERICA,
        referencia_externa="",
        levantar_excecao=False,
    ):
        return self.send(
            destination=destino,
            message=mensagem,
            channel=canal,
            subject=assunto,
            patient=paciente,
            event_type=tipo_evento,
            external_reference=referencia_externa,
            raise_exception=levantar_excecao,
        )

    def _legacy_send_to_patient(
        self,
        paciente,
        mensagem,
        assunto="Notificação",
        tipo_evento=Notification.TipoEvento.GENERICA,
        referencia_externa="",
    ):
        return self.send_to_patient(
            patient=paciente,
            message=mensagem,
            subject=assunto,
            event_type=tipo_evento,
            external_reference=referencia_externa,
        )


ServicoNotificacao = NotificationService
CANAIS = CHANNELS
NotificationService._canal_ativo = NotificationService._legacy_active_channel
NotificationService._obter_existente = NotificationService._legacy_get_existing
NotificationService.enviar = NotificationService._legacy_send
NotificationService.enviar_para_paciente = NotificationService._legacy_send_to_patient
