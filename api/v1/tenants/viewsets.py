"""Facade module for tenant viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    FeatureFlagTenantViewSet,
    SubscriptionPlanViewSet,
    TenantConfigurationViewSet,
    TenantUsageViewSet,
    TenantViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "FeatureFlagTenantViewSet",
    "SubscriptionPlanViewSet",
    "TenantConfigurationViewSet",
    "TenantUsageViewSet",
    "TenantViewSet",
]
