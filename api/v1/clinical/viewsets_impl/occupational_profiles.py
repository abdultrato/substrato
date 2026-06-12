from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.occupational_profile import OccupationalExamProfile

from ..serializers import OccupationalExamProfileSerializer


@extend_schema(
    description="Perfis ocupacionais (bandejas de exames por profissão) para medicina do trabalho",
    tags=["Clínico - Perfis ocupacionais"],
)
class OccupationalExamProfileViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = OccupationalExamProfile.objects.all().prefetch_related("exams")
    serializer_class = OccupationalExamProfileSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "profession", "description", "exams__name"]
    ordering_fields = [
        "custom_id",
        "name",
        "profession",
        "active",
        "created_at",
        "updated_at",
        "version",
    ]
    ordering = ["name"]
