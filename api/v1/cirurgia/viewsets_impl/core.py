from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.cirurgia.modelos.cirurgia import Cirurgia
from aplicativos.cirurgia.modelos.procedimento_cirurgico import ProcedimentoCirurgico

from ..filters import CirurgiaFilter, ProcedimentoCirurgicoFilter
from ..serializers import CirurgiaSerializer, ProcedimentoCirurgicoSerializer


class CirurgiaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Cirurgia.objects.select_related("paciente", "cirurgiao").prefetch_related("procedimentos").all()
    serializer_class = CirurgiaSerializer
    filterset_class = CirurgiaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "procedimento", "paciente__nome", "cirurgiao__username"]
    ordering_fields = ["agendada_para", "criado_em", "estado"]
    ordering = ["-agendada_para", "-criado_em"]


class ProcedimentoCirurgicoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ProcedimentoCirurgico.objects.all()
    serializer_class = ProcedimentoCirurgicoSerializer
    filterset_class = ProcedimentoCirurgicoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "descricao"]
    ordering_fields = ["nome", "ativo", "criado_em"]
    ordering = ["nome"]


VIEWSET_MAP = {
    "cirurgia": CirurgiaViewSet,
    "procedimentocirurgico": ProcedimentoCirurgicoViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "CirurgiaViewSet",
    "ProcedimentoCirurgicoViewSet",
]
