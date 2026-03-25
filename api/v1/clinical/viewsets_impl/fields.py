from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.medical_exam import MedicalExamField

from ..filters import LabExamFieldFilter, MedicalExamFieldFilter
from ..serializers import LabExamFieldSerializer, MedicalExamFieldSerializer


@extend_schema(
    description="Gerenciamento de campos de exams",
    tags=["Clínico - Campos de Exame"],
)
class LabExamFieldViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Viewset for laboratory exam fields."""

    queryset = LabExamField.objects.all()
    serializer_class = LabExamFieldSerializer
    filterset_class = LabExamFieldFilter
    permission_classes = [IsAuthenticated]
    # LabExamField does not expose `description`/`active`/`order`.
    # Keep exam fields searchable for frontend workflows.
    search_fields = ["custom_id", "name", "type", "unit", "exam__name", "exam__custom_id"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "exam",
        "type",
        "unit",
        "reference_min",
        "reference_max",
        "critical_min",
        "critical_max",
        "max_delta",
        "version",
    ]
    ordering = ["-created_at"]


@extend_schema(
    description="Gerenciamento de campos de exams médicos",
    tags=["Clínico - Campos de Exame Médico"],
)
class MedicalExamFieldViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalExamField.objects.all()
    serializer_class = MedicalExamFieldSerializer
    filterset_class = MedicalExamFieldFilter
    permission_classes = [IsAuthenticated]
    # MedicalExamField does not expose `description`/`active`/`order`.
    search_fields = ["custom_id", "name", "type", "exam__name", "exam__custom_id"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "exam",
        "type",
        "version",
    ]
    ordering = ["-created_at"]


