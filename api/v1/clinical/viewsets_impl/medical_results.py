from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.medical_result_file import MedicalResultFile

from ..filters import MedicalResultFileFilter
from ..serializers import MedicalResultFileSerializer


@extend_schema(
    description="Arquivos/links gerados para exames médicos (imagens, laudos, DICOM).",
    tags=["Clínico - Resultados Médicos"],
)
class MedicalResultFileViewSet(
    ValidatedSearchOrderingMixin,
    TenantScopedQuerysetMixin,
    ModelViewSet,
):
    queryset = MedicalResultFile.objects.all()
    serializer_class = MedicalResultFileSerializer
    filterset_class = MedicalResultFileFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "descricao", "tipo"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "criado_em",
        "atualizado_em",
        "exame_medico",
        "tipo",
    ]
    ordering = ["-criado_em"]

    @extend_schema(
        description="Lista arquivos (PDF/imagens) associados a um exame médico.",
        parameters=[
            OpenApiParameter("search", OpenApiTypes.STR, OpenApiParameter.QUERY),
            OpenApiParameter("ordering", OpenApiTypes.STR, OpenApiParameter.QUERY),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


ResultadoMedicoArquivoViewSet = MedicalResultFileViewSet
