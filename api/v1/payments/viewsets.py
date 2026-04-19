"""Facade module for payments viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    PaymentViewSet,
    ReceiptViewSet,
    ReconciliationViewSet,
    TransactionViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "PaymentViewSet",
    "ReceiptViewSet",
    "ReconciliationViewSet",
    "TransactionViewSet",
]
