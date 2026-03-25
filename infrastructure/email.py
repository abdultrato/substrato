from django.core.mail import send_mail


def send_email(destination, subject, message):
    send_mail(
        subject=subject,
        message=message,
        from_email=None,
        recipient_list=[destination],
    )
