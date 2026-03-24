"""Facade module for insurer viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    CoveragePlanViewSet,
    InsurerViewSet,
    ProcedureAuthorizationViewSet,
    AutorizacaoProcedimentoViewSet,
    PlanoCoberturaViewSet,
    SeguradoraViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ProcedureAuthorizationViewSet",
    "CoveragePlanViewSet",
    "InsurerViewSet",
    "AutorizacaoProcedimentoViewSet",
    "PlanoCoberturaViewSet",
    "SeguradoraViewSet",
]
