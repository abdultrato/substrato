from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.medical_exam import MedicalExamField

from ..filters import ExameCampoFilter, ExameMedicoCampoFilter
from ..serializers import ExameCampoSerializer, ExameMedicoCampoSerializer


@extend_schema(
    description="Gerenciamento de campos de exames",
    tags=["Clínico - Campos de Exame"],
)
class ExameCampoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """ViewSet para gerenciar campos (parâmetros) de exames laboratoriais."""

    queryset = LabExamField.objects.all()
    serializer_class = ExameCampoSerializer
    filterset_class = ExameCampoFilter
    permission_classes = [IsAuthenticated]
    # ExameCampo nao possui `descricao`/`ativo`/`ordem`.
    # Incluimos campos do exame para busca util no frontend.
    search_fields = ["id_custom", "nome", "tipo", "unidade", "exame__nome", "exame__id_custom"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "exame",
        "tipo",
        "unidade",
        "referencia_min",
        "referencia_max",
        "critico_min",
        "critico_max",
        "delta_max",
        "versao",
    ]
    ordering = ["-criado_em"]


@extend_schema(
    description="Gerenciamento de campos de exames médicos",
    tags=["Clínico - Campos de Exame Médico"],
)
class ExameMedicoCampoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalExamField.objects.all()
    serializer_class = ExameMedicoCampoSerializer
    filterset_class = ExameMedicoCampoFilter
    permission_classes = [IsAuthenticated]
    # ExameMedicoCampo nao possui `descricao`/`ativo`/`ordem`.
    search_fields = ["id_custom", "nome", "tipo", "exame__nome", "exame__id_custom"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "exame",
        "tipo",
        "versao",
    ]
    ordering = ["-criado_em"]
