from collections import defaultdict
from typing import Callable

_registro_eventos = defaultdict(list)


def registrar(evento_nome: str, handler: Callable):
    """
    Registra um handler para um evento.
    """
    _registro_eventos[evento_nome].append(handler)


def obter_handlers(evento_nome: str):
    return _registro_eventos.get(evento_nome, [])
