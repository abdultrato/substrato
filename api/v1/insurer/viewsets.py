"""Facade module for insurer viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    AutorizacaoProcedimentoViewSet,
    CoveragePlanViewSet,
    InsurerViewSet,
    PlanoCoberturaViewSet,
    ProcedureAuthorizationViewSet,
    SeguradoraViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "AutorizacaoProcedimentoViewSet",
    "CoveragePlanViewSet",
    "InsurerViewSet",
    "PlanoCoberturaViewSet",
    "ProcedureAuthorizationViewSet",
    "SeguradoraViewSet",
]
