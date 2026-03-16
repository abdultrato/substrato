from django.core.mail import send_mail


def enviar_email(destino, assunto, mensagem):
    send_mail(
        subject=assunto,
        message=mensagem,
        from_email=None,
        recipient_list=[destino],
    )
