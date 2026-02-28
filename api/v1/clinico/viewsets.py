from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_analise_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from .filters import *
from .serializers import *

class ExameViewSet(ModelViewSet):
    queryset = Exame.objects.all()
    serializer_class = ExameSerializer
    filterset_class = ExameFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'metodo', 'setor']
    ordering_fields = ['inquilino', 'id_custom', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'nome', 'descricao', 'trl_horas', 'preco', 'metodo', 'setor']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class ExameCampoViewSet(ModelViewSet):
    queryset = ExameCampo.objects.all()
    serializer_class = ExameCampoSerializer
    filterset_class = ExameCampoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'tipo', 'unidade', 'descricao']
    ordering_fields = ['inquilino', 'id_custom', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'exame', 'tipo', 'unidade', 'descricao', 'valor_minimo', 'valor_maximo', 'critico_baixo', 'critico_alto', 'valores_normais', 'valores_alterados', 'valores_criticos', 'delta_check_ativo', 'detectar_tendencia', 'destacar_no_laudo']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class PacienteViewSet(ModelViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    filterset_class = PacienteFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'email', 'descricao', 'genero', 'raca_origem']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'nome', 'data_nascimento', 'genero', 'raca_origem', 'tipo_documento', 'numero_id', 'morada', 'contacto', 'email', 'proveniencia']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class RequisicaoAnaliseViewSet(ModelViewSet):
    queryset = RequisicaoAnalise.objects.all()
    serializer_class = RequisicaoAnaliseSerializer
    filterset_class = RequisicaoAnaliseFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'observacoes', 'status', 'status_clinico']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'paciente', 'analista', 'observacoes', 'status', 'status_clinico', 'possui_resultado_critico']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class RequisicaoItemViewSet(ModelViewSet):
    queryset = RequisicaoItem.objects.all()
    serializer_class = RequisicaoItemSerializer
    filterset_class = RequisicaoItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao']
    ordering_fields = ['inquilino', 'deletado', 'deletado_em', 'criado_por', 'atualizado_por', 'id_custom', 'criado_em', 'atualizado_em', 'descricao', 'nome', 'ordem', 'ativo', 'requisicao', 'exame', 'preco_unitario', 'quantidade']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

class ResultadoItemViewSet(ModelViewSet):
    queryset = ResultadoItem.objects.all()
    serializer_class = ResultadoItemSerializer
    filterset_class = ResultadoItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ['id_custom', 'nome', 'descricao', 'resultado', 'status_clinico', 'cor_laudo']
    ordering_fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'requisicao', 'exame_campo', 'resultado', 'status_clinico', 'cor_laudo', 'alerta_critico', 'delta_alerta', 'tendencia', 'interpretacao', 'validado', 'validado_por', 'data_validacao']
    ordering = ['-criado_em']

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

VIEWSET_MAP = {
    'exame': ExameViewSet,
    'examecampo': ExameCampoViewSet,
    'paciente': PacienteViewSet,
    'requisicaoanalise': RequisicaoAnaliseViewSet,
    'requisicaoitem': RequisicaoItemViewSet,
    'resultadoitem': ResultadoItemViewSet,
}

__all__ = [
    'ExameViewSet',
    'ExameCampoViewSet',
    'PacienteViewSet',
    'RequisicaoAnaliseViewSet',
    'RequisicaoItemViewSet',
    'ResultadoItemViewSet',
    'VIEWSET_MAP',
]
