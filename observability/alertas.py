from .logs import erro


def alerta_critico(mensagem):
    erro(f"ALERTA CRÍTICO: {mensagem}")
