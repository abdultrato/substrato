"""Funções utilitárias relacionadas a marcação de tempo."""

from django.utils import timezone


def now():
    """Retorna o horário atual com fuso configurado pelo Django."""
    return timezone.now()


agora = now
