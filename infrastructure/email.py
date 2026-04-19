"""Envio simples de e-mails via backend configurado do Django."""

from django.core.mail import send_mail


def send_email(destination, subject, message):
    """Envia um e-mail de texto simples para o destinatário informado."""
    send_mail(
        subject=subject,
        message=message,
        from_email=None,
        recipient_list=[destination],
    )
