from django.core.mail import send_mail


def enviar_email(destino, subject, message):
    send_mail(
        subject=subject,
        message=message,
        from_email=None,
        recipient_list=[destino],
    )
