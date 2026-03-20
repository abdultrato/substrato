from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.clinico.modelos.resultado_medico_arquivo import ResultadoMedicoArquivo
from ..filters import ResultadoMedicoArquivoFilter
from ..serializers import ResultadoMedicoArquivoSerializer


@extend_schema(
    description="Arquivos/links gerados para exames médicos (imagens, laudos, DICOM).",
    tags=["Clínico - Resultados Médicos"],
)
class ResultadoMedicoArquivoViewSet(
    ValidatedSearchOrderingMixin,
    TenantScopedQuerysetMixin,
    ModelViewSet,
):
    queryset = ResultadoMedicoArquivo.objects.all()
    serializer_class = ResultadoMedicoArquivoSerializer
    filterset_class = ResultadoMedicoArquivoFilter
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
