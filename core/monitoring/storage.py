import os

from django.conf import settings


def calculate_local_usage():
    """
    Calcula o uso de storage local no MEDIA_ROOT.
    """
    media_path = settings.MEDIA_ROOT
    total = 0

    for root, _, files in os.walk(media_path):
        for f in files:
            total += os.path.getsize(os.path.join(root, f))

    return total


__all__ = ["calculate_local_usage"]
