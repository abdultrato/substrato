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
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "ativo",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "inquilino",
            "fuso_horario",
            "moeda",
            "idioma",
            "permite_multi_unidade",
            "limite_usuarios",
        ]


# =====================================================
# FEATURE FLAG TENANT
# =====================================================


class FeatureFlagTenantFilter(SafeFilterSet):
    class Meta:
        model = TenantFeatureFlag
        fields = [
            "inquilino",
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "chave",
            "ativo",
        ]


# =====================================================
# TENANTS
# =====================================================


class TenantFilter(SafeFilterSet):
    class Meta:
        model = Tenant
        fields = [
            "id_custom",
            "descricao",
            "ordem",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "identificador",
            "nome",
            "dominio",
            "ativo",
            "status_comercial",
            "trial_ate",
            "bloqueado_em",
        ]


# =====================================================
# SUBSCRIPTION PLANS
# =====================================================


class SubscriptionPlanFilter(SafeFilterSet):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "tipo",
            "limite_usuarios",
            "limite_requisicoes_mes",
            "preco_mensal",
            "preco_excedente_requisicao",
            "suporte_prioritario",
            "permite_multi_unidade",
            "ativo",
        ]


# =====================================================
# TENANT USAGE
# =====================================================


class TenantUsageFilter(SafeFilterSet):
    class Meta:
        model = TenantUsage
        fields = [
            "id_custom",
            "descricao",
            "nome",
            "ordem",
            "ativo",
            "deletado",
            "deletado_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "inquilino",
            "usuarios_ativos",
            "requisicoes_mes_atual",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "configuracaoinquilino": TenantConfigurationFilter,
    "featureflagtenant": FeatureFlagTenantFilter,
    "inquilino": TenantFilter,
    "planoassinatura": SubscriptionPlanFilter,
    "usotenant": TenantUsageFilter,
}

ConfiguracaoInquilinoFilter = TenantConfigurationFilter
InquilinoFilter = TenantFilter
PlanoAssinaturaFilter = SubscriptionPlanFilter
UsoTenantFilter = TenantUsageFilter
