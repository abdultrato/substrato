"""Serializers DRF para tenants, planos, configurações e uso."""

from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.tenant_usage import TenantUsage

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)

BASE_ALIASES = {
    "id_custom": "custom_id",
    "codigo": "custom_id",
    "código": "custom_id",
    "nome": "name",
    "descricao": "description",
    "descrição": "description",
    "ordem": "order",
    "posicao": "order",
    "posição": "order",
    "ativo": "active",
    "activa": "active",
    "ativa": "active",
}

TENANT_ALIASES = {
    **BASE_ALIASES,
    "inquilino": "name",
    "tenant": "name",
    "cliente": "name",
    "hospital": "name",
    "identificador": "identifier",
    "identificador_tenant": "identifier",
    "codigo_tenant": "identifier",
    "código_tenant": "identifier",
    "slug": "identifier",
    "dominio": "domain",
    "domínio": "domain",
    "domain": "domain",
    "estado_comercial": "commercial_status",
    "status_comercial": "commercial_status",
    "situacao_comercial": "commercial_status",
    "situação_comercial": "commercial_status",
    "commercial_status": "commercial_status",
    "trial_ate": "trial_until",
    "trial_até": "trial_until",
    "teste_ate": "trial_until",
    "teste_até": "trial_until",
    "trial_until": "trial_until",
    "bloqueado_em": "blocked_at",
    "blocked_at": "blocked_at",
}

TENANT_CONFIGURATION_ALIASES = {
    **BASE_ALIASES,
    "fuso_horario": "time_zone",
    "fuso_horário": "time_zone",
    "timezone": "time_zone",
    "time_zone": "time_zone",
    "moeda": "currency",
    "currency": "currency",
    "idioma": "language",
    "lingua": "language",
    "língua": "language",
    "language": "language",
    "permite_multiunidade": "allows_multi_unit",
    "multiunidade": "allows_multi_unit",
    "multi_unidade": "allows_multi_unit",
    "allows_multi_unit": "allows_multi_unit",
    "limite_utilizadores": "user_limit",
    "limite_usuarios": "user_limit",
    "limite_de_utilizadores": "user_limit",
    "limite_de_usuarios": "user_limit",
    "user_limit": "user_limit",
    "sobretaxa_feriado_consulta": "holiday_consultation_percentage_surcharge",
    "percentagem_feriado_consulta": "holiday_consultation_percentage_surcharge",
    "acrescimo_feriado_consulta": "holiday_consultation_percentage_surcharge",
    "acréscimo_feriado_consulta": "holiday_consultation_percentage_surcharge",
}

FEATURE_FLAG_ALIASES = {
    **BASE_ALIASES,
    "chave": "key",
    "codigo_flag": "key",
    "código_flag": "key",
    "feature": "key",
    "feature_flag": "key",
    "funcionalidade": "key",
    "flag": "key",
    "key": "key",
}

SUBSCRIPTION_PLAN_ALIASES = {
    **BASE_ALIASES,
    "plano": "name",
    "plano_assinatura": "name",
    "plano_subscricao": "name",
    "plano_subscrição": "name",
    "tipo": "type",
    "type": "type",
    "limite_utilizadores": "user_limit",
    "limite_usuarios": "user_limit",
    "limite_de_utilizadores": "user_limit",
    "limite_requisicoes_mensais": "monthly_request_limit",
    "limite_requisições_mensais": "monthly_request_limit",
    "limite_pedidos_mensais": "monthly_request_limit",
    "monthly_request_limit": "monthly_request_limit",
    "preco_mensal": "monthly_price",
    "preço_mensal": "monthly_price",
    "valor_mensal": "monthly_price",
    "monthly_price": "monthly_price",
    "preco_excedente": "request_overage_price",
    "preço_excedente": "request_overage_price",
    "preco_excedente_requisicao": "request_overage_price",
    "preço_excedente_requisição": "request_overage_price",
    "request_overage_price": "request_overage_price",
    "suporte_prioritario": "priority_support",
    "suporte_prioritário": "priority_support",
    "priority_support": "priority_support",
    "permite_multiunidade": "allows_multi_unit",
    "allows_multi_unit": "allows_multi_unit",
}

TENANT_USAGE_ALIASES = {
    **BASE_ALIASES,
    "uso": "active_users",
    "utilizadores_activos": "active_users",
    "utilizadores_ativos": "active_users",
    "usuarios_ativos": "active_users",
    "usuarios_activos": "active_users",
    "active_users": "active_users",
    "requisicoes_mes_actual": "current_month_requests",
    "requisições_mês_actual": "current_month_requests",
    "requisicoes_mes_atual": "current_month_requests",
    "requisições_mês_atual": "current_month_requests",
    "pedidos_mes": "current_month_requests",
    "current_month_requests": "current_month_requests",
}


class TenantConfigurationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = TENANT_CONFIGURATION_ALIASES
    legacy_output_aliases = TENANT_CONFIGURATION_ALIASES

    class Meta:
        model = TenantConfiguration
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FeatureFlagTenantSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = FEATURE_FLAG_ALIASES
    legacy_output_aliases = FEATURE_FLAG_ALIASES

    class Meta:
        model = TenantFeatureFlag
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class TenantSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = TENANT_ALIASES
    legacy_output_aliases = TENANT_ALIASES

    class Meta:
        model = Tenant
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class SubscriptionPlanSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SUBSCRIPTION_PLAN_ALIASES
    legacy_output_aliases = SUBSCRIPTION_PLAN_ALIASES

    class Meta:
        model = SubscriptionPlan
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class TenantUsageSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = TENANT_USAGE_ALIASES
    legacy_output_aliases = TENANT_USAGE_ALIASES

    class Meta:
        model = TenantUsage
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "configuracaoinquilino": TenantConfigurationSerializer,
    "featureflagtenant": FeatureFlagTenantSerializer,
    "tenant": TenantSerializer,
    "planoassinatura": SubscriptionPlanSerializer,
    "usotenant": TenantUsageSerializer,
}

