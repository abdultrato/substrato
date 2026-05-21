"""Facade module for insurer viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    CoveragePlanViewSet,
    InsurerViewSet,
    ProcedureAuthorizationViewSet,
    TenantCoveragePlanViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "CoveragePlanViewSet",
    "InsurerViewSet",
    "ProcedureAuthorizationViewSet",
    "TenantCoveragePlanViewSet",
]
