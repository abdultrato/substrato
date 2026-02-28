from contextvars import ContextVar


"""
Contexto isolado por request.

✔ Seguro para WSGI
✔ Seguro para ASGI
✔ Compatível com async
✔ Sem vazamento entre requisições
"""

_inquilino_ctx: ContextVar = ContextVar("inquilino", default=None)


def set_inquilino(inquilino):
    """
    Define o tenant no contexto atual.
    """
    _inquilino_ctx.set(inquilino)


def get_inquilino():
    """
    Obtém o tenant atual.
    """
    return _inquilino_ctx.get()


def clear_inquilino():
    """
    Remove o tenant do contexto.
    """
    _inquilino_ctx.set(None)
