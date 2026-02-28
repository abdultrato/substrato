import django_filters

from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from aplicativos.seguradora.modelos.plano_cobertura import PlanoCobertura
from aplicativos.seguradora.modelos.seguradora import Seguradora

class AutorizacaoProcedimentoFilter(django_filters.FilterSet):
    class Meta:
        model = AutorizacaoProcedimento
        fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'requisicao_id', 'plano', 'status', 'codigo_autorizacao', 'data_resposta']

class PlanoCoberturaFilter(django_filters.FilterSet):
    class Meta:
        model = PlanoCobertura
        fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'seguradora', 'percentual_cobertura', 'exige_autorizacao']

class SeguradoraFilter(django_filters.FilterSet):
    class Meta:
        model = Seguradora
        fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'codigo_externo', 'email', 'telefone', 'ativa']

FILTER_MAP = {
    'autorizacaoprocedimento': AutorizacaoProcedimentoFilter,
    'planocobertura': PlanoCoberturaFilter,
    'seguradora': SeguradoraFilter,
}
