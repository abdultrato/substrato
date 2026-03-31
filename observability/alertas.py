from .logs import error


def critical_alert(message):
    error(f"ALERTA CRÍTICO: {message}")
"""Gatilhos de alerta para condições operacionais fora do normal."""
