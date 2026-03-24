"""
Facade module for Inquilinos ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    ConfiguracaoInquilinoViewSet,
    FeatureFlagTenantViewSet,
    InquilinoViewSet,
    PlanoAssinaturaViewSet,
    UsoTenantViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ConfiguracaoInquilinoViewSet",
    "FeatureFlagTenantViewSet",
    "InquilinoViewSet",
    "PlanoAssinaturaViewSet",
    "UsoTenantViewSet",
]
