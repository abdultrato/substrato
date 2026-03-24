from django.conf import settings
from django.utils import timezone

from .canais.email import CanalEmail
from .canais.sms import CanalSMS
from .canais.whatsapp import CanalWhatsApp
from .excecoes import FalhaEnvio
from .models.delivery_log import DeliveryLog
from .models.notification import Notification

CANAIS = {
    Notification.Canal.EMAIL: CanalEmail(),
    Notification.Canal.SMS: CanalSMS(),
    Notification.Canal.WHATSAPP: CanalWhatsApp(),
}


class ServicoNotificacao:
    def _canal_ativo(self, canal):
        if canal == Notification.Canal.EMAIL:
            ativo = getattr(settings, "NOTIFICACOES_EMAIL_ATIVAS", True)
            return (ativo, "Canal de e-mail desativado por configuração.")

        if canal == Notification.Canal.SMS:
            ativo = getattr(settings, "NOTIFICACOES_SMS_ATIVAS", False)
            if not ativo:
                return (False, "Canal de SMS desativado por configuração.")

            if not getattr(settings, "SMS_API_URL", "") or not getattr(settings, "SMS_API_KEY", ""):
                return (False, "Credenciais de SMS não configuradas.")

            return (True, "")

        if canal == Notification.Canal.WHATSAPP:
            ativo = getattr(settings, "NOTIFICACOES_WHATSAPP_ATIVAS", False)
            if not ativo:
                return (False, "Canal de WhatsApp desativado por configuração.")

            if not getattr(settings, "WHATSAPP_API_URL", "") or not getattr(settings, "WHATSAPP_API_KEY", ""):
                return (False, "Credenciais de WhatsApp não configuradas.")

            return (True, "")

        return (True, "")

    def _obter_existente(self, canal, tipo_evento, referencia_externa, destino):
        if not referencia_externa:
            return None

        return (
            Notification.objects.filter(
                canal=canal,
                tipo_evento=tipo_evento,
                referencia_externa=referencia_externa,
                destinatario=destino,
                enviada=True,
            )
            .order_by("-id")
            .first()
        )

    def enviar(
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
        if not destino:
            raise ValueError("Destino da notificação é obrigatório.")
        if canal not in CANAIS:
            raise ValueError(f"Canal inválido: {canal}")

        existente = self._obter_existente(
            canal=canal,
            tipo_evento=tipo_evento,
            referencia_externa=referencia_externa,
            destino=destino,
        )
        if existente:
            return existente

        notificacao = Notification.objects.create(
            paciente=paciente,
            destinatario=destino,
            canal=canal,
            assunto=assunto or "",
            tipo_evento=tipo_evento,
            referencia_externa=referencia_externa or "",
            mensagem=mensagem,
        )

        canal_ativo, motivo_inativo = self._canal_ativo(canal)
        if not canal_ativo:
            DeliveryLog.objects.create(
                notificacao=notificacao,
                status="ignorado",
                resposta=motivo_inativo,
            )
            return notificacao

        try:
            resposta = CANAIS[canal].enviar(
                destino=destino,
                mensagem=mensagem,
                assunto=assunto,
            )
            notificacao.enviada = True
            notificacao.enviado_em = timezone.now()
            notificacao.erro_envio = ""
            notificacao.save(update_fields=["enviada", "enviado_em", "erro_envio"])

            DeliveryLog.objects.create(
                notificacao=notificacao,
                status="sucesso",
                resposta=str(resposta),
            )
        except Exception as erro:
            notificacao.erro_envio = str(erro)
            notificacao.save(update_fields=["erro_envio"])
            DeliveryLog.objects.create(
                notificacao=notificacao,
                status="erro",
                resposta=str(erro),
            )
            if levantar_excecao:
                raise FalhaEnvio(str(erro)) from erro

        return notificacao

    def enviar_para_paciente(
        self,
        paciente,
        mensagem,
        assunto="Notificação",
        tipo_evento=Notification.TipoEvento.GENERICA,
        referencia_externa="",
    ):
        if not paciente:
            return []

        notificacoes = []

        paciente_relacionado = paciente if hasattr(paciente, "_meta") else None
        email = getattr(paciente, "email", None)
        telefone = getattr(paciente, "contacto", None)

        if email:
            notificacoes.append(
                self.enviar(
                    destino=email,
                    mensagem=mensagem,
                    canal=Notification.Canal.EMAIL,
                    assunto=assunto,
                    paciente=paciente_relacionado,
                    tipo_evento=tipo_evento,
                    referencia_externa=referencia_externa,
                )
            )

        if telefone:
            notificacoes.append(
                self.enviar(
                    destino=str(telefone),
                    mensagem=mensagem,
                    canal=Notification.Canal.SMS,
                    assunto=assunto,
                    paciente=paciente_relacionado,
                    tipo_evento=tipo_evento,
                    referencia_externa=referencia_externa,
                )
            )

        return notificacoes
