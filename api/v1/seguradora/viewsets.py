from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from aplicativos.seguradora.modelos.plano_cobertura import PlanoCobertura
from aplicativos.seguradora.modelos.seguradora import Seguradora
from .filters import *
from .serializers import *

class AutorizacaoProcedimentoViewSet(ModelViewSet):
    queryset = AutorizacaoProcedimento.objects.all()
    serializer_class = AutorizacaoProcedimentoSerializer
    filterset_class = AutorizacaoProcedimentoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'status', 'codigo_autorizacao']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'requisicao_id', 'plano', 'status', 'codigo_autorizacao', 'data_resposta']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class PlanoCoberturaViewSet(ModelViewSet):
    queryset = PlanoCobertura.objects.all()
    serializer_class = PlanoCoberturaSerializer
    filterset_class = PlanoCoberturaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'seguradora', 'percentual_cobertura', 'exige_autorizacao']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class SeguradoraViewSet(ModelViewSet):
    queryset = Seguradora.objects.all()
    serializer_class = SeguradoraSerializer
    filterset_class = SeguradoraFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'email', 'telefone', 'descricao', 'codigo_externo']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'codigo_externo', 'email', 'telefone', 'ativa']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

VIEWSET_MAP = {
    'autorizacaoprocedimento': AutorizacaoProcedimentoViewSet,
    'planocobertura': PlanoCoberturaViewSet,
    'seguradora': SeguradoraViewSet,
}

__all__ = [
    'AutorizacaoProcedimentoViewSet',
    'PlanoCoberturaViewSet',
    'SeguradoraViewSet',
    'VIEWSET_MAP',
]
