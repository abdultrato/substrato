import os

from django.conf import settings


def calcular_uso_local():
    media_path = settings.MEDIA_ROOT
    total = 0

    for root, _, files in os.walk(media_path):
        for f in files:
            total += os.path.getsize(os.path.join(root, f))

    return total
