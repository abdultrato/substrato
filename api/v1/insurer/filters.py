from api.core.filters import SafeFilterSet
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization

# =====================================================
# PROCEDURE AUTHORIZATIONS
# =====================================================


class ProcedureAuthorizationFilter(SafeFilterSet):
    class Meta:
        model = ProcedureAuthorization
        fields = [
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


# =====================================================
# COVERAGE PLANS
# =====================================================


class CoveragePlanFilter(SafeFilterSet):
    class Meta:
        model = CoveragePlan
        fields = [
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


# =====================================================
# INSURERS
# =====================================================


class InsurerFilter(SafeFilterSet):
    class Meta:
        model = Insurer
        fields = [
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


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "autorizacaoprocedimento": ProcedureAuthorizationFilter,
    "planocobertura": CoveragePlanFilter,
    "seguradora": InsurerFilter,
}

AutorizacaoProcedimentoFilter = ProcedureAuthorizationFilter
PlanoCoberturaFilter = CoveragePlanFilter
SeguradoraFilter = InsurerFilter
