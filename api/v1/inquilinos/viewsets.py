from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.inquilinos.modelos.configuracao import ConfiguracaoInquilino
from aplicativos.inquilinos.modelos.feature_flags import FeatureFlagTenant
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.inquilinos.modelos.plano_assinatura import PlanoAssinatura
from aplicativos.inquilinos.modelos.uso_tenant import UsoTenant
from .filters import *
from .serializers import *

class ConfiguracaoInquilinoViewSet(ModelViewSet):
    queryset = ConfiguracaoInquilino.objects.all()
    serializer_class = ConfiguracaoInquilinoSerializer
    filterset_class = ConfiguracaoInquilinoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'fuso_horario', 'moeda', 'idioma']
    ordering_fields = ['id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'inquilino', 'fuso_horario', 'moeda', 'idioma', 'permite_multi_unidade', 'limite_usuarios']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class FeatureFlagTenantViewSet(ModelViewSet):
    queryset = FeatureFlagTenant.objects.all()
    serializer_class = FeatureFlagTenantSerializer
    filterset_class = FeatureFlagTenantFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'chave']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'chave', 'ativo']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class InquilinoViewSet(ModelViewSet):
    queryset = Inquilino.objects.all()
    serializer_class = InquilinoSerializer
    filterset_class = InquilinoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'identificador', 'dominio', 'status_comercial']
    ordering_fields = ['id_custom', 'descricao', 'ordem', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'identificador', 'nome', 'dominio', 'ativo', 'status_comercial', 'trial_ate', 'bloqueado_em']
    ordering = ['-criado_em']

class PlanoAssinaturaViewSet(ModelViewSet):
    queryset = PlanoAssinatura.objects.all()
    serializer_class = PlanoAssinaturaSerializer
    filterset_class = PlanoAssinaturaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'tipo']
    ordering_fields = ['id_custom', 'descricao', 'nome', 'ordem', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'tipo', 'limite_usuarios', 'limite_requisicoes_mes', 'preco_mensal', 'preco_excedente_requisicao', 'suporte_prioritario', 'permite_multi_unidade', 'ativo']
    ordering = ['-criado_em']

class UsoTenantViewSet(ModelViewSet):
    queryset = UsoTenant.objects.all()
    serializer_class = UsoTenantSerializer
    filterset_class = UsoTenantFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao']
    ordering_fields = ['id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'inquilino', 'usuarios_ativos', 'requisicoes_mes_atual']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

VIEWSET_MAP = {
    'configuracaoinquilino': ConfiguracaoInquilinoViewSet,
    'featureflagtenant': FeatureFlagTenantViewSet,
    'inquilino': InquilinoViewSet,
    'planoassinatura': PlanoAssinaturaViewSet,
    'usotenant': UsoTenantViewSet,
}

__all__ = [
    'ConfiguracaoInquilinoViewSet',
    'FeatureFlagTenantViewSet',
    'InquilinoViewSet',
    'PlanoAssinaturaViewSet',
    'UsoTenantViewSet',
    'VIEWSET_MAP',
]
