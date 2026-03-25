from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.medical_exam import MedicalExam

from ..filters import LabExamFilter, MedicalExamFilter
from ..serializers import LabExamSerializer, MedicalExamSerializer


@extend_schema(
    description="Gerenciamento de exams laboratoriais",
    tags=["Clínico - Exames"],
)
class LabExamViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """
    Viewset for laboratory exams.

    Available operations:
    - LIST: list all exams with filters, search, and pagination
    - CREATE: create a new exam
    - RETRIEVE: fetch exam details
    - UPDATE: fully update an exam
    - DELETE: soft-delete an exam
    """

    queryset = LabExam.objects.all()
    serializer_class = LabExamSerializer
    filterset_class = LabExamFilter
    permission_classes = [IsAuthenticated]
    # LabExam does not expose `description`/`active`/`order`.
    # Keep search/order fields aligned with real model fields.
    search_fields = ["custom_id", "name", "method", "sector"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "name",
        "turnaround_hours",
        "price",
        "vat_percentage",
        "method",
        "sector",
        "version",
    ]
    ordering = ["-created_at"]

    @extend_schema(
        description="Listar todos os exams com filtros, busca e paginação",
        parameters=[
            OpenApiParameter(
                "search", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Buscar por name, método, sector"
            ),
            OpenApiParameter("ordering", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Campo para ordenação"),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description="Criar novo exam com validação de campos obrigatórios",
        request=LabExamSerializer,
        responses={201: LabExamSerializer},
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        description="Obter detalhes de um exam específico",
        responses={200: LabExamSerializer},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar exam completamente",
        request=LabExamSerializer,
        responses={200: LabExamSerializer},
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar parcialmente um exam",
        request=LabExamSerializer,
        responses={200: LabExamSerializer},
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        description="Deletar um exam (soft delete)",
        responses={204: None},
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


@extend_schema(
    description="Gerenciamento de exams médicos (imagem/diagnóstico)",
    tags=["Clínico - Exames Médicos"],
)
class MedicalExamViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalExam.objects.all()
    serializer_class = MedicalExamSerializer
    filterset_class = MedicalExamFilter
    permission_classes = [IsAuthenticated]
    # MedicalExam follows the same shape as LabExam.
    search_fields = ["custom_id", "name", "method", "sector"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "name",
        "turnaround_hours",
        "price",
        "vat_percentage",
        "method",
        "sector",
        "version",
    ]
    ordering = ["-created_at"]


ExameViewSet = LabExamViewSet
ExameMedicoViewSet = MedicalExamViewSet
