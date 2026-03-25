from .logs import error


def critical_alert(message):
    error(f"ALERTA CRÍTICO: {message}")
