from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from aplicativos.monitoramento.modelos.erro_sistema import ErroSistema

from .filters import ErroSistemaFilter
from .serializers import ErroSistemaSerializer


class ErroSistemaViewSet(ReadOnlyModelViewSet):
    queryset = ErroSistema.objects.select_related("usuario").all()
    serializer_class = ErroSistemaSerializer
    filterset_class = ErroSistemaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["caminho", "exception_class", "mensagem", "usuario__username"]
    ordering_fields = ["criado_em", "status_code", "exception_class"]
    ordering = ["-criado_em", "-id"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs


VIEWSET_MAP = {
    "erro": ErroSistemaViewSet,
}

__all__ = [
    "ErroSistemaViewSet",
    "VIEWSET_MAP",
]

