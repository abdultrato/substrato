"""Facade module for tenant viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    ConfiguracaoInquilinoViewSet,
    FeatureFlagTenantViewSet,
    InquilinoViewSet,
    PlanoAssinaturaViewSet,
    SubscriptionPlanViewSet,
    TenantConfigurationViewSet,
    TenantUsageViewSet,
    TenantViewSet,
    UsoTenantViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ConfiguracaoInquilinoViewSet",
    "FeatureFlagTenantViewSet",
    "InquilinoViewSet",
    "PlanoAssinaturaViewSet",
    "SubscriptionPlanViewSet",
    "TenantConfigurationViewSet",
    "TenantUsageViewSet",
    "TenantViewSet",
    "UsoTenantViewSet",
]
