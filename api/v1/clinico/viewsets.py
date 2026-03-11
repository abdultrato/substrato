from drf_spectacular.decorators import extend_schema, extend_schema_field
from drf_spectacular.openapi import OpenApiParameter, OpenApiTypes
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .filters import *
from .serializers import *


@extend_schema(
	description='Gerenciamento de exames laboratoriais',
	tags=['Clínico - Exames'],
)
class ExameViewSet(ModelViewSet):
	"""
	ViewSet para gerenciar exames laboratoriais.
	
	Operações disponíveis:
	- LIST: Listar todos os exames (com filtros, busca e paginação)
	- CREATE: Criar novo exame
	- RETRIEVE: Obter detalhes de um exame
	- UPDATE: Atualizar exame
	- DELETE: Deletar exame
	"""

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

	@extend_schema(
		description='Listar todos os exames com filtros, busca e paginação',
		parameters=[
			OpenApiParameter('search', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Buscar por nome, método, setor'),
			OpenApiParameter('ordering', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Campo para ordenação'),
		],
	)
	def list(self, request, *args, **kwargs):
		return super().list(request, *args, **kwargs)

	@extend_schema(
		description='Criar novo exame com validação de campos obrigatórios',
		request=ExameSerializer,
		responses={201: ExameSerializer},
	)
	def create(self, request, *args, **kwargs):
		return super().create(request, *args, **kwargs)

	@extend_schema(
		description='Obter detalhes de um exame específico',
		responses={200: ExameSerializer},
	)
	def retrieve(self, request, *args, **kwargs):
		return super().retrieve(request, *args, **kwargs)

	@extend_schema(
		description='Atualizar exame completamente',
		request=ExameSerializer,
		responses={200: ExameSerializer},
	)
	def update(self, request, *args, **kwargs):
		return super().update(request, *args, **kwargs)

	@extend_schema(
		description='Atualizar parcialmente um exame',
		request=ExameSerializer,
		responses={200: ExameSerializer},
	)
	def partial_update(self, request, *args, **kwargs):
		return super().partial_update(request, *args, **kwargs)

	@extend_schema(
		description='Deletar um exame (soft delete)',
		responses={204: None},
	)
	def destroy(self, request, *args, **kwargs):
		return super().destroy(request, *args, **kwargs)


@extend_schema(
	description='Gerenciamento de campos de exames',
	tags=['Clínico - Campos de Exame'],
)
class ExameCampoViewSet(ModelViewSet):
	"""ViewSet para gerenciar campos (parâmetros) de exames laboratoriais."""

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


@extend_schema(
	description='Gerenciamento de pacientes',
	tags=['Clínico - Pacientes'],
)
class PacienteViewSet(ModelViewSet):
	"""
	ViewSet para gerenciar pacientes.
	
	Campos principais:
	- nome: Nome completo (obrigatório)
	- email: Email único para contato
	- data_nascimento: Data de nascimento (para cálculo de idade)
	- genero: Gênero (M/F)
	- numero_id: Documento de identidade (único)
	- morada: Endereço residencial
	- gestante: Indicador de gestação
	"""

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

	@extend_schema(
		description='Listar pacientes com filtros, busca e paginação',
		parameters=[
			OpenApiParameter('search', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Buscar por nome, email, género'),
			OpenApiParameter('genero', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filtrar por gênero'),
		],
	)
	def list(self, request, *args, **kwargs):
		return super().list(request, *args, **kwargs)

	@extend_schema(
		description='Criar novo paciente com validação de email e documento únicos',
		request=PacienteSerializer,
		responses={201: PacienteSerializer},
	)
	def create(self, request, *args, **kwargs):
		return super().create(request, *args, **kwargs)

	@extend_schema(
		description='Obter detalhes de um paciente',
		responses={200: PacienteSerializer},
	)
	def retrieve(self, request, *args, **kwargs):
		return super().retrieve(request, *args, **kwargs)

	@extend_schema(
		description='Atualizar paciente completamente',
		request=PacienteSerializer,
		responses={200: PacienteSerializer},
	)
	def update(self, request, *args, **kwargs):
		return super().update(request, *args, **kwargs)

	@extend_schema(
		description='Atualizar parcialmente um paciente',
		request=PacienteSerializer,
		responses={200: PacienteSerializer},
	)
	def partial_update(self, request, *args, **kwargs):
		return super().partial_update(request, *args, **kwargs)


@extend_schema(
	description='Gerenciamento de requisições de análise',
	tags=['Clínico - Requisições'],
)
class RequisicaoAnaliseViewSet(ModelViewSet):
	"""ViewSet para gerenciar requisições de análise laboratorial."""

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


@extend_schema(
	description='Gerenciamento de itens de requisição',
	tags=['Clínico - Requisições'],
)
class RequisicaoItemViewSet(ModelViewSet):
	"""ViewSet para gerenciar itens (exames) de uma requisição."""

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


@extend_schema(
	description='Gerenciamento de resultados de análises',
	tags=['Clínico - Resultados'],
)
class ResultadoItemViewSet(ModelViewSet):
	"""ViewSet para gerenciar resultados de análises laboratoriais."""

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