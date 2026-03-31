"""Exceções de domínio genéricas para reutilização entre módulos."""


class DomainError(Exception):
    """Erro base para sinalizar falhas de regra de negócio."""

    pass


ErroDominio = DomainError
