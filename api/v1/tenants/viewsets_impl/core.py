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
    search_fields = ["id_custom", "fuso_horario", "moeda", "idioma"]
    ordering_fields = [
        "id_custom",
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
        "acrescimo_percentual_consulta_feriado",
        "versao",
    ]
    ordering = ["-criado_em"]


class FeatureFlagTenantViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TenantFeatureFlag.objects.all()
    serializer_class = FeatureFlagTenantSerializer
    filterset_class = FeatureFlagTenantFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "chave"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "chave",
        "ativo",
        "versao",
    ]
    ordering = ["-criado_em"]


class TenantViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    filterset_class = TenantFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "identificador", "dominio", "status_comercial"]
    ordering_fields = [
        "id_custom",
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
        "versao",
    ]
    ordering = ["-criado_em"]


class SubscriptionPlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    filterset_class = SubscriptionPlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "descricao", "tipo"]
    ordering_fields = [
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
    ordering = ["-criado_em"]


class TenantUsageViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TenantUsage.objects.all()
    serializer_class = TenantUsageSerializer
    filterset_class = TenantUsageFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "inquilino__nome", "inquilino__identificador"]
    ordering_fields = [
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "inquilino",
        "usuarios_ativos",
        "requisicoes_mes_atual",
        "versao",
    ]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "configuracaoinquilino": TenantConfigurationViewSet,
    "featureflagtenant": FeatureFlagTenantViewSet,
    "inquilino": TenantViewSet,
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

ConfiguracaoInquilinoViewSet = TenantConfigurationViewSet
InquilinoViewSet = TenantViewSet
PlanoAssinaturaViewSet = SubscriptionPlanViewSet
UsoTenantViewSet = TenantUsageViewSet
