"""ViewSets da API v1 para tenants, planos, configurações, flags e usage."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.tenant_usage import TenantUsage

from ..filters import (
    FeatureFlagTenantFilter,
    SubscriptionPlanFilter,
    TenantConfigurationFilter,
    TenantFilter,
    TenantUsageFilter,
)
from ..serializers import (
    FeatureFlagTenantSerializer,
    SubscriptionPlanSerializer,
    TenantConfigurationSerializer,
    TenantSerializer,
    TenantUsageSerializer,
)


class TenantConfigurationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TenantConfiguration.objects.all()
    serializer_class = TenantConfigurationSerializer
    filterset_class = TenantConfigurationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "time_zone", "currency", "language"]
    ordering_fields = [
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "tenant",
        "time_zone",
        "currency",
        "language",
        "allows_multi_unit",
        "user_limit",
        "holiday_consultation_percentage_surcharge",
        "version",
    ]
    ordering = ["-created_at"]


class FeatureFlagTenantViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TenantFeatureFlag.objects.all()
    serializer_class = FeatureFlagTenantSerializer
    filterset_class = FeatureFlagTenantFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "key"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "key",
        "active",
        "version",
    ]
    ordering = ["-created_at"]


class TenantViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    filterset_class = TenantFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "identifier", "domain", "commercial_status"]
    ordering_fields = [
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "identifier",
        "name",
        "domain",
        "active",
        "commercial_status",
        "trial_until",
        "blocked_at",
        "version",
    ]
    ordering = ["-created_at"]


class SubscriptionPlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    filterset_class = SubscriptionPlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description", "type"]
    ordering_fields = [
        "custom_id",
        "description",
        "name",
        "order",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "type",
        "user_limit",
        "monthly_request_limit",
        "monthly_price",
        "request_overage_price",
        "priority_support",
        "allows_multi_unit",
        "active",
    ]
    ordering = ["-created_at"]


class TenantUsageViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TenantUsage.objects.all()
    serializer_class = TenantUsageSerializer
    filterset_class = TenantUsageFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "tenant__name", "tenant__identifier"]
    ordering_fields = [
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "tenant",
        "active_users",
        "current_month_requests",
        "version",
    ]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "configuracaoinquilino": TenantConfigurationViewSet,
    "featureflagtenant": FeatureFlagTenantViewSet,
    "tenant": TenantViewSet,
    "planoassinatura": SubscriptionPlanViewSet,
    "usotenant": TenantUsageViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "FeatureFlagTenantViewSet",
    "SubscriptionPlanViewSet",
    "TenantConfigurationViewSet",
    "TenantUsageViewSet",
    "TenantViewSet",
]

