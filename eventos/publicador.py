from .assinantes import obter_assinantes


def publicar(evento):
    for handler in obter_assinantes(type(evento)):
        handler(evento)
