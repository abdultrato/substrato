from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization

from ..filters import CoveragePlanFilter, InsurerFilter, ProcedureAuthorizationFilter
from ..serializers import CoveragePlanSerializer, InsurerSerializer, ProcedureAuthorizationSerializer


class ProcedureAuthorizationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ProcedureAuthorization.objects.all()
    serializer_class = ProcedureAuthorizationSerializer
    filterset_class = ProcedureAuthorizationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "descricao", "status", "codigo_autorizacao"]
    ordering_fields = [
        "inquilino",
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
        "requisicao_id",
        "plano",
        "status",
        "codigo_autorizacao",
        "data_resposta",
    ]
    ordering = ["-criado_em"]


class CoveragePlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CoveragePlan.objects.all()
    serializer_class = CoveragePlanSerializer
    filterset_class = CoveragePlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "descricao"]
    ordering_fields = [
        "inquilino",
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
        "seguradora",
        "percentual_cobertura",
        "exige_autorizacao",
    ]
    ordering = ["-criado_em"]


class InsurerViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Insurer.objects.all()
    serializer_class = InsurerSerializer
    filterset_class = InsurerFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "email", "telefone", "descricao", "codigo_externo"]
    ordering_fields = [
        "inquilino",
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
        "codigo_externo",
        "email",
        "telefone",
        "ativa",
    ]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "autorizacaoprocedimento": ProcedureAuthorizationViewSet,
    "planocobertura": CoveragePlanViewSet,
    "seguradora": InsurerViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "CoveragePlanViewSet",
    "InsurerViewSet",
    "ProcedureAuthorizationViewSet",
]

AutorizacaoProcedimentoViewSet = ProcedureAuthorizationViewSet
PlanoCoberturaViewSet = CoveragePlanViewSet
SeguradoraViewSet = InsurerViewSet
