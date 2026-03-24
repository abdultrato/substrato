"""
Facade module for Farmacia ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    ItemVendaViewSet,
    LoteViewSet,
    MovimentoEstoqueViewSet,
    ProdutoViewSet,
    VendaViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ItemVendaViewSet",
    "LoteViewSet",
    "MovimentoEstoqueViewSet",
    "ProdutoViewSet",
    "VendaViewSet",
]
