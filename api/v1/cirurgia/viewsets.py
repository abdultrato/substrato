from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.cirurgia.modelos.cirurgia import Cirurgia
from aplicativos.cirurgia.modelos.procedimento_cirurgico import ProcedimentoCirurgico

from .filters import CirurgiaFilter, ProcedimentoCirurgicoFilter
from .serializers import CirurgiaSerializer, ProcedimentoCirurgicoSerializer


class CirurgiaViewSet(ModelViewSet):
    queryset = (
        Cirurgia.objects.select_related("paciente", "cirurgiao")
        .prefetch_related("procedimentos")
        .all()
    )
    serializer_class = CirurgiaSerializer
    filterset_class = CirurgiaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "procedimento", "paciente__nome", "cirurgiao__username"]
    ordering_fields = ["agendada_para", "criado_em", "estado"]
    ordering = ["-agendada_para", "-criado_em"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs


class ProcedimentoCirurgicoViewSet(ModelViewSet):
    queryset = ProcedimentoCirurgico.objects.all()
    serializer_class = ProcedimentoCirurgicoSerializer
    filterset_class = ProcedimentoCirurgicoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "descricao"]
    ordering_fields = ["nome", "ativo", "criado_em"]
    ordering = ["nome"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs


VIEWSET_MAP = {
    "cirurgia": CirurgiaViewSet,
    "procedimentocirurgico": ProcedimentoCirurgicoViewSet,
}

__all__ = [
    "CirurgiaViewSet",
    "ProcedimentoCirurgicoViewSet",
    "VIEWSET_MAP",
]
