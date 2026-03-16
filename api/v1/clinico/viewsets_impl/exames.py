from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exames_medicos import ExameMedico

from ..filters import ExameFilter, ExameMedicoFilter
from ..serializers import ExameMedicoSerializer, ExameSerializer


@extend_schema(
    description="Gerenciamento de exames laboratoriais",
    tags=["Clínico - Exames"],
)
class ExameViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
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
    # Nota: o modelo Exame nao possui campo `descricao` (nem `ativo`/`ordem`).
    # Manter apenas campos reais evita 500 (FieldError) quando o frontend usa `?search=...` ou `?ordering=...`.
    search_fields = ["id_custom", "nome", "metodo", "setor"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "nome",
        "trl_horas",
        "preco",
        "iva_percentual",
        "metodo",
        "setor",
        "versao",
    ]
    ordering = ["-criado_em"]

    @extend_schema(
        description="Listar todos os exames com filtros, busca e paginação",
        parameters=[
            OpenApiParameter(
                "search", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Buscar por nome, método, setor"
            ),
            OpenApiParameter("ordering", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Campo para ordenação"),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description="Criar novo exame com validação de campos obrigatórios",
        request=ExameSerializer,
        responses={201: ExameSerializer},
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        description="Obter detalhes de um exame específico",
        responses={200: ExameSerializer},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar exame completamente",
        request=ExameSerializer,
        responses={200: ExameSerializer},
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar parcialmente um exame",
        request=ExameSerializer,
        responses={200: ExameSerializer},
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        description="Deletar um exame (soft delete)",
        responses={204: None},
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


@extend_schema(
    description="Gerenciamento de exames médicos (imagem/diagnóstico)",
    tags=["Clínico - Exames Médicos"],
)
class ExameMedicoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ExameMedico.objects.all()
    serializer_class = ExameMedicoSerializer
    filterset_class = ExameMedicoFilter
    permission_classes = [IsAuthenticated]
    # ExameMedico segue o mesmo shape de Exame (sem `descricao`/`ativo`/`ordem`).
    search_fields = ["id_custom", "nome", "metodo", "setor"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "nome",
        "trl_horas",
        "preco",
        "iva_percentual",
        "metodo",
        "setor",
        "versao",
    ]
    ordering = ["-criado_em"]
