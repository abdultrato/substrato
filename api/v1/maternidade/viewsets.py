from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.maternidade.modelos.gestacao import Gestacao

from .filters import GestacaoFilter
from .serializers import GestacaoSerializer


class GestacaoViewSet(ModelViewSet):
    queryset = Gestacao.objects.select_related("paciente", "medico_responsavel").all()
    serializer_class = GestacaoSerializer
    filterset_class = GestacaoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "paciente__nome", "medico_responsavel__username"]
    ordering_fields = ["criado_em", "estado", "data_prevista_parto"]
    ordering = ["-criado_em", "-id"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs


VIEWSET_MAP = {
    "gestacao": GestacaoViewSet,
}

__all__ = [
    "GestacaoViewSet",
    "VIEWSET_MAP",
]

