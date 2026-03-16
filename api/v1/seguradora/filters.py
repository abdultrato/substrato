from api.core.filters import SafeFilterSet
from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from aplicativos.seguradora.modelos.plano_cobertura import PlanoCobertura
from aplicativos.seguradora.modelos.seguradora import Seguradora

# =====================================================
# AUTORIZAÇÃO PROCEDIMENTO
# =====================================================


class AutorizacaoProcedimentoFilter(SafeFilterSet):
    class Meta:
        model = AutorizacaoProcedimento
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
# PLANO COBERTURA
# =====================================================


class PlanoCoberturaFilter(SafeFilterSet):
    class Meta:
        model = PlanoCobertura
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
# SEGURADORA
# =====================================================


class SeguradoraFilter(SafeFilterSet):
    class Meta:
        model = Seguradora
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
    "autorizacaoprocedimento": AutorizacaoProcedimentoFilter,
    "planocobertura": PlanoCoberturaFilter,
    "seguradora": SeguradoraFilter,
}
