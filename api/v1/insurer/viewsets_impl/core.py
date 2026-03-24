from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer

from ..filters import AutorizacaoProcedimentoFilter, PlanoCoberturaFilter, SeguradoraFilter
from ..serializers import AutorizacaoProcedimentoSerializer, PlanoCoberturaSerializer, SeguradoraSerializer


class AutorizacaoProcedimentoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ProcedureAuthorization.objects.all()
    serializer_class = AutorizacaoProcedimentoSerializer
    filterset_class = AutorizacaoProcedimentoFilter
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


class PlanoCoberturaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CoveragePlan.objects.all()
    serializer_class = PlanoCoberturaSerializer
    filterset_class = PlanoCoberturaFilter
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


class SeguradoraViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Insurer.objects.all()
    serializer_class = SeguradoraSerializer
    filterset_class = SeguradoraFilter
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
    "autorizacaoprocedimento": AutorizacaoProcedimentoViewSet,
    "planocobertura": PlanoCoberturaViewSet,
    "seguradora": SeguradoraViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AutorizacaoProcedimentoViewSet",
    "PlanoCoberturaViewSet",
    "SeguradoraViewSet",
]
