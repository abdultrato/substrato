from infrastructure.utils.retry import retry


class RetryMixin:
    retry = staticmethod(retry)
"""Mixin para adicionar lógica de retry controlado em operações."""
