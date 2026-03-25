from rest_framework import serializers

from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.tenant_usage import TenantUsage


class TenantConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantConfiguration
        fields = "__all__"


class FeatureFlagTenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantFeatureFlag
        fields = "__all__"


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = "__all__"


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"


class TenantUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantUsage
        fields = "__all__"


SERIALIZER_MAP = {
    "configuracaoinquilino": TenantConfigurationSerializer,
    "featureflagtenant": FeatureFlagTenantSerializer,
    "tenant": TenantSerializer,
    "planoassinatura": SubscriptionPlanSerializer,
    "usotenant": TenantUsageSerializer,
}

ConfiguracaoInquilinoSerializer = TenantConfigurationSerializer
InquilinoSerializer = TenantSerializer
PlanoAssinaturaSerializer = SubscriptionPlanSerializer
UsoTenantSerializer = TenantUsageSerializer
