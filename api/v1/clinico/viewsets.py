from drf_spectacular.utils import (
	extend_schema,
	extend_schema_field,
	OpenApiParameter,
	OpenApiTypes,
	)
from drf_spectacular.openapi import (
	OpenApiParameter,
	OpenApiTypes,
	)
from decimal import Decimal, InvalidOperation
from django.http import HttpResponse
from django.db import transaction
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from dominio.clinico.estado_resultado import EstadoResultado

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
	description='Gerenciamento de exames médicos (imagem/diagnóstico)',
	tags=['Clínico - Exames Médicos'],
)
class ExameMedicoViewSet(ModelViewSet):
	queryset = ExameMedico.objects.all()
	serializer_class = ExameMedicoSerializer
	filterset_class = ExameMedicoFilter
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
	description='Gerenciamento de campos de exames médicos',
	tags=['Clínico - Campos de Exame Médico'],
)
class ExameMedicoCampoViewSet(ModelViewSet):
	queryset = ExameMedicoCampo.objects.all()
	serializer_class = ExameMedicoCampoSerializer
	filterset_class = ExameMedicoCampoFilter
	permission_classes = [IsAuthenticated]
	search_fields = ['id_custom', 'nome', 'tipo', 'unidade', 'descricao']
	ordering_fields = ['inquilino', 'id_custom', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'exame', 'tipo', 'unidade', 'descricao']
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

	@action(detail=True, methods=["get"])
	def pdf_resultados(self, request, pk=None):
		"""
		Gera o PDF institucional de resultados laboratoriais (somente validados).

		- Autenticação via JWT (API v1)
		- RBAC controla acesso; reforçamos aqui para evitar exposição acidental
		  do PDF a perfis que apenas "consultam" requisições.
		"""
		from seguranca.permissoes.rbac import GROUPS as RBAC_GROUPS, _normalize

		user = getattr(request, "user", None)
		if not user or not getattr(user, "is_authenticated", False):
			raise PermissionDenied("Autenticação obrigatória.")

		if not getattr(user, "is_superuser", False):
			try:
				raw_groups = list(user.groups.values_list("name", flat=True))
			except Exception:
				raw_groups = []
			user_groups = {_normalize(g) for g in raw_groups if g}
			permitidos = {
				_normalize(RBAC_GROUPS["ADMIN"]),
				_normalize(RBAC_GROUPS["LABORATORIO"]),
			}
			if not (user_groups & permitidos):
				raise PermissionDenied(
					"Apenas Técnico de Laboratório ou Administrador pode emitir PDF de resultados."
				)

		requisicao = self.get_object()
		# PDF de resultados aplica-se ao fluxo laboratorial.
		if requisicao.tipo != requisicao.Tipo.LABORATORIO:
			raise PermissionDenied("Esta requisição não possui PDF de resultados laboratoriais.")

		# Não gerar PDF se nenhum resultado estiver validado.
		resultado = getattr(requisicao, "resultado", None)
		if not resultado or not resultado.itens.filter(estado=EstadoResultado.VALIDADO).exists():
			raise ValidationError("Não é possível emitir PDF sem nenhum resultado validado.")

		from tarefas.gerar_pdf.pdf_generator_resultado import gerar_pdf_resultados

		pdf_bytes, filename = gerar_pdf_resultados(requisicao, apenas_validados=True)
		resp = HttpResponse(pdf_bytes, content_type="application/pdf")
		resp["Content-Disposition"] = f'inline; filename="{filename}"'
		return resp

	@action(detail=True, methods=["get"])
	def resultado_itens(self, request, pk=None):
		"""
		Retorna os itens de resultados de uma requisição LAB com campos derivados
		para suportar o lançamento/validação inline no frontend.
		"""
		requisicao = self.get_object()

		if requisicao.tipo != requisicao.Tipo.LABORATORIO:
			raise PermissionDenied("Esta requisição não possui resultados laboratoriais.")

		from aplicativos.clinico.modelos.resultado import Resultado

		resultado, _ = Resultado.objects.get_or_create(
			requisicao=requisicao,
			defaults={"inquilino": requisicao.inquilino},
		)

		qs = (
			resultado.itens.select_related(
				"exame_campo",
				"exame_campo__exame",
				"resultado",
				"resultado__requisicao",
				"resultado__requisicao__paciente",
			)
			.order_by(
				"exame_campo__exame__nome",
				"exame_campo__nome",
				"id",
			)
		)

		itens = ResultadoItemLaboratorioSerializer(qs, many=True).data

		resumo = {
			"total": qs.count(),
			"pendente": qs.filter(estado=EstadoResultado.PENDENTE).count(),
			"em_analise": qs.filter(estado=EstadoResultado.EM_ANALISE).count(),
			"aguardando_validacao": qs.filter(estado=EstadoResultado.AGUARDANDO_VALIDACAO).count(),
			"validado": qs.filter(estado=EstadoResultado.VALIDADO).count(),
			"rejeitado": qs.filter(estado=EstadoResultado.REJEITADO).count(),
		}

		return Response(
			{
				"requisicao": {
					"id": requisicao.id,
					"id_custom": requisicao.id_custom,
					"paciente": requisicao.paciente_id,
					"paciente_nome": requisicao.paciente.nome,
					"estado": requisicao.estado,
					"status_clinico": requisicao.status_clinico,
					"possui_resultado_critico": requisicao.possui_resultado_critico,
				},
				"resumo": resumo,
				"itens": itens,
			}
		)


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

	def _is_admin_user(self, user) -> bool:
		if not user or not getattr(user, "is_authenticated", False):
			return False
		if getattr(user, "is_superuser", False):
			return True
		try:
			from seguranca.permissoes.rbac import GROUPS as RBAC_GROUPS, _normalize
			raw_groups = list(user.groups.values_list("name", flat=True))
			user_groups = {_normalize(g) for g in raw_groups if g}
			return _normalize(RBAC_GROUPS["ADMIN"]) in user_groups
		except Exception:
			return False

	# -----------------------------------------------------------------
	# Restrição: alterações diretas no ResultadoItem (PUT/PATCH) podem
	# burlar a máquina de estados. Para perfis não-admin, obrigamos o uso
	# das ações `lancar`, `gravar` e `validar`.
	# -----------------------------------------------------------------

	def update(self, request, *args, **kwargs):
		if not self._is_admin_user(getattr(request, "user", None)):
			raise PermissionDenied("Use as ações: lancar, gravar e validar.")
		return super().update(request, *args, **kwargs)

	def partial_update(self, request, *args, **kwargs):
		if not self._is_admin_user(getattr(request, "user", None)):
			raise PermissionDenied("Use as ações: lancar, gravar e validar.")
		return super().partial_update(request, *args, **kwargs)

	@action(detail=True, methods=["post"])
	def lancar(self, request, pk=None):
		"""Transiciona o item de resultado para EM_ANALISE (passo 1: lançar)."""
		item = self.get_object()
		if item.estado == EstadoResultado.EM_ANALISE:
			return Response(ResultadoItemLaboratorioSerializer(item).data)

		try:
			item.transicionar(EstadoResultado.EM_ANALISE, usuario=getattr(request, "user", None))
		except Exception as e:
			raise ValidationError(str(e))

		item.refresh_from_db()
		return Response(ResultadoItemLaboratorioSerializer(item).data)

	@action(detail=True, methods=["post"])
	def gravar(self, request, pk=None):
		"""
		Salva o valor do resultado e transiciona para AGUARDANDO_VALIDACAO
		(passo 2: gravar).
		"""
		item = self.get_object()

		raw = (request.data or {}).get("resultado_valor", None)
		if raw is None:
			raw = (request.data or {}).get("valor", None)

		if raw is None or (isinstance(raw, str) and not raw.strip()):
			raise ValidationError({"resultado_valor": "Informe um valor antes de gravar."})

		try:
			valor = Decimal(str(raw).replace(",", "."))
		except (InvalidOperation, TypeError, ValueError):
			raise ValidationError({"resultado_valor": "Valor inválido."})

		from dominio.clinico.state_machine_resultado import ResultadoStateMachine, TransicaoInvalidaError

		with transaction.atomic():
			locked = (
				ResultadoItem.all_objects.select_for_update()
				.select_related("resultado", "resultado__requisicao", "resultado__requisicao__paciente", "exame_campo", "exame_campo__exame")
				.get(pk=item.pk)
			)

			try:
				ResultadoStateMachine.validar_transicao(
					locked.estado,
					EstadoResultado.AGUARDANDO_VALIDACAO,
				)
			except TransicaoInvalidaError as e:
				raise ValidationError(str(e))

			locked.resultado_valor = valor
			locked.estado = EstadoResultado.AGUARDANDO_VALIDACAO
			locked.save()

		locked.refresh_from_db()
		return Response(ResultadoItemLaboratorioSerializer(locked).data)

	@action(detail=True, methods=["post"])
	def validar(self, request, pk=None):
		"""Transiciona o item de resultado para VALIDADO (passo 3: validar)."""
		item = self.get_object()
		if item.estado == EstadoResultado.VALIDADO:
			return Response(ResultadoItemLaboratorioSerializer(item).data)

		try:
			item.transicionar(EstadoResultado.VALIDADO, usuario=getattr(request, "user", None))
		except Exception as e:
			raise ValidationError(str(e))

		item.refresh_from_db()
		return Response(ResultadoItemLaboratorioSerializer(item).data)


VIEWSET_MAP = {
	'exame': ExameViewSet,
	'examemedico': ExameMedicoViewSet,
	'examecampo': ExameCampoViewSet,
	'examemedicocampo': ExameMedicoCampoViewSet,
	'paciente': PacienteViewSet,
	'requisicaoanalise': RequisicaoAnaliseViewSet,
	'requisicaoitem': RequisicaoItemViewSet,
	'resultadoitem': ResultadoItemViewSet,
}

__all__ = [
	'ExameViewSet',
	'ExameMedicoViewSet',
	'ExameCampoViewSet',
	'ExameMedicoCampoViewSet',
	'PacienteViewSet',
	'RequisicaoAnaliseViewSet',
	'RequisicaoItemViewSet',
	'ResultadoItemViewSet',
	'VIEWSET_MAP',
]
