from collections import defaultdict

_assinantes = defaultdict(list)


def publicar(evento, dados):
    for handler in _assinantes[evento]:
        handler(dados)


def assinar(evento, handler):
    _assinantes[evento].append(handler)
