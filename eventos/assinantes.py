_assinantes = {}


def registrar(evento_tipo, handler):
    _assinantes.setdefault(evento_tipo, []).append(handler)


def obter_assinantes(evento_tipo):
    return _assinantes.get(evento_tipo, [])
