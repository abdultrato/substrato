"""Alias para o modelo Receipt para manter importações antigas funcionando."""

from apps.payments.models.receipt import Receipt

__all__ = ["Receipt"]
