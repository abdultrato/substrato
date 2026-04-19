"""Gerencia o usuário corrente via ContextVar durante o ciclo da requisição."""

# LOCAL: infrastrutura/contexto/request_user.py

from contextvars import ContextVar

_current_user: ContextVar = ContextVar(
    "current_user",
    default=None,
)


def set_current_user(user):
    """Armazena o usuário atual no contexto."""
    _current_user.set(user)


def get_current_user():
    """Retorna o usuário atual armazenado no contexto."""
    return _current_user.get()


def clear_current_user():
    """Remove qualquer usuário definido no contexto."""
    _current_user.set(None)
