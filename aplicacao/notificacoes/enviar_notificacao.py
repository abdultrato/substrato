from django.db import transaction

from aplicativos.notificacoes.modelos.notificacao import Notificacao
from aplicativos.notificacoes.modelos.log_envio import LogEnvio
from dominio.notificacoes.excecoes import FalhaEnvio

from integracoes.mensageria.email import EmailService
from integracoes.mensageria.sms import SMSService
from integracoes.mensageria.whatsapp import WhatsAppService


CANAIS = {
    "email": EmailService(),
    "sms": SMSService(),
    "whatsapp": WhatsAppService(),
}


@transaction.atomic
def enviar_notificacao(destino: str, mensagem: str, canal: str):

    if canal not in CANAIS:
        raise ValueError(f"Canal inválido: {canal}")

    notificacao = Notificacao.objects.create(
        destinatario=destino,
        mensagem=mensagem,
        canal=canal,
    )

    try:
        resposta = CANAIS[canal].enviar(destino, mensagem)

        LogEnvio.objects.create(
            notificacao=notificacao,
            status="sucesso",
            resposta=str(resposta),
        )

        notificacao.enviada = True
        notificacao.save(update_fields=["enviada"])

    except Exception as erro:

        LogEnvio.objects.create(
            notificacao=notificacao,
            status="erro",
            resposta=str(erro),
        )

        raise FalhaEnvio(str(erro))

    return notificacao
