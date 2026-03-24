from django.utils import timezone


def now():
    return timezone.now()


agora = now
