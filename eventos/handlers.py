from functools import wraps

from .registro import registrar


def handler(evento_nome: str):
    """
    Decorator para registrar handler automaticamente.
    """

    def decorator(func):
        registrar(evento_nome, func)

        @wraps(func)
        def wrapper(evento):
            return func(evento)

        return wrapper

    return decorator
