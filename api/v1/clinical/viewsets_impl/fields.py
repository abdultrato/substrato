from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.medical_exam import MedicalExamField

from ..filters import LabExamFieldFilter, MedicalExamFieldFilter
from ..serializers import LabExamFieldSerializer, MedicalExamFieldSerializer


@extend_schema(
    description="Gerenciamento de campos de exames",
    tags=["Clínico - Campos de Exame"],
)
class LabExamFieldViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Viewset for laboratory exam fields."""

    queryset = LabExamField.objects.all()
    serializer_class = LabExamFieldSerializer
    filterset_class = LabExamFieldFilter
    permission_classes = [IsAuthenticated]
    # LabExamField does not expose `descricao`/`ativo`/`ordem`.
    # Keep exam fields searchable for frontend workflows.
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
class MedicalExamFieldViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalExamField.objects.all()
    serializer_class = MedicalExamFieldSerializer
    filterset_class = MedicalExamFieldFilter
    permission_classes = [IsAuthenticated]
    # MedicalExamField does not expose `descricao`/`ativo`/`ordem`.
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


ExameCampoViewSet = LabExamFieldViewSet
ExameMedicoCampoViewSet = MedicalExamFieldViewSet
