"""
Facade module for Seguradora ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    AutorizacaoProcedimentoViewSet,
    PlanoCoberturaViewSet,
    SeguradoraViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "AutorizacaoProcedimentoViewSet",
    "PlanoCoberturaViewSet",
    "SeguradoraViewSet",
]
