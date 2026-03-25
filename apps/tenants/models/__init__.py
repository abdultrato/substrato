from .configuration import TenantConfiguration
from .feature_flags import TenantFeatureFlag
from .subscription import TenantSubscription
from .subscription_plan import SubscriptionPlan
from .tenant import Tenant
from .tenant_usage import TenantUsage

AssinaturaTenant = TenantSubscription
ConfiguracaoInquilino = TenantConfiguration
FeatureFlagTenant = TenantFeatureFlag
Inquilino = Tenant
PlanoAssinatura = SubscriptionPlan
UsoTenant = TenantUsage

__all__ = [
    "AssinaturaTenant",
    "ConfiguracaoInquilino",
    "FeatureFlagTenant",
    "Inquilino",
    "PlanoAssinatura",
    "SubscriptionPlan",
    "Tenant",
    "TenantConfiguration",
    "TenantFeatureFlag",
    "TenantSubscription",
    "TenantUsage",
    "UsoTenant",
]
