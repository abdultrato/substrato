from api.core.filters import SafeFilterSet
from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.tenant_usage import TenantUsage

# =====================================================
# TENANT CONFIGURATIONS
# =====================================================


class TenantConfigurationFilter(SafeFilterSet):
    class Meta:
        model = TenantConfiguration
        fields = [
            "custom_id",
            "description",
            "name",
            "order",
            "active",
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
        ]


# =====================================================
# FEATURE FLAG TENANT
# =====================================================


class FeatureFlagTenantFilter(SafeFilterSet):
    class Meta:
        model = TenantFeatureFlag
        fields = [
            "tenant",
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
            "key",
            "active",
        ]


# =====================================================
# TENANTS
# =====================================================


class TenantFilter(SafeFilterSet):
    class Meta:
        model = Tenant
        fields = [
            "custom_id",
            "description",
            "order",
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
        ]


# =====================================================
# SUBSCRIPTION PLANS
# =====================================================


class SubscriptionPlanFilter(SafeFilterSet):
    class Meta:
        model = SubscriptionPlan
        fields = [
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


# =====================================================
# TENANT USAGE
# =====================================================


class TenantUsageFilter(SafeFilterSet):
    class Meta:
        model = TenantUsage
        fields = [
            "custom_id",
            "description",
            "name",
            "order",
            "active",
            "deleted",
            "deleted_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "tenant",
            "active_users",
            "current_month_requests",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "configuracaoinquilino": TenantConfigurationFilter,
    "featureflagtenant": FeatureFlagTenantFilter,
    "tenant": TenantFilter,
    "planoassinatura": SubscriptionPlanFilter,
    "usotenant": TenantUsageFilter,
}

ConfiguracaoInquilinoFilter = TenantConfigurationFilter
InquilinoFilter = TenantFilter
PlanoAssinaturaFilter = SubscriptionPlanFilter
UsoTenantFilter = TenantUsageFilter
