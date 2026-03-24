from rest_framework import serializers

from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant_usage import TenantUsage


class ConfiguracaoInquilinoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantConfiguration
        fields = "__all__"


class FeatureFlagTenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantFeatureFlag
        fields = "__all__"


class InquilinoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = "__all__"


class PlanoAssinaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"


class UsoTenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantUsage
        fields = "__all__"


SERIALIZER_MAP = {
    "configuracaoinquilino": ConfiguracaoInquilinoSerializer,
    "featureflagtenant": FeatureFlagTenantSerializer,
    "inquilino": InquilinoSerializer,
    "planoassinatura": PlanoAssinaturaSerializer,
    "usotenant": UsoTenantSerializer,
}
