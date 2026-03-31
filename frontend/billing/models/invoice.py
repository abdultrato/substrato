"""Reexporta o modelo Invoice para compatibilidade de importações."""

from apps.billing.models.invoice import Invoice

__all__ = ["Invoice"]
