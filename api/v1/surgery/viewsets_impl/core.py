from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.surgery.models.surgery import Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure
from apps.billing.models.invoice import Invoice

from ..filters import CirurgiaFilter, ProcedimentoCirurgicoFilter
from ..serializers import CirurgiaSerializer, ProcedimentoCirurgicoSerializer


class CirurgiaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Surgery.objects.select_related("paciente", "cirurgiao").prefetch_related("procedimentos").all()
    serializer_class = CirurgiaSerializer
    filterset_class = CirurgiaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "procedimento", "paciente__nome", "cirurgiao__username"]
    ordering_fields = ["agendada_para", "criado_em", "estado"]
    ordering = ["-agendada_para", "-criado_em"]

    @action(detail=True, methods=["post"])
    def criar_fatura(self, request, pk=None):
        cirurgia = self.get_object()

        if hasattr(cirurgia, "fatura") and getattr(cirurgia, "fatura", None):
            fatura = cirurgia.fatura
        else:
            fatura = Invoice(
                inquilino=cirurgia.inquilino,
                origem=Invoice.Origem.CIRURGIA,
                cirurgia=cirurgia,
                paciente=cirurgia.paciente,
            )
            fatura.full_clean()
            fatura.save()

        if fatura.estado != Invoice.Estado.RASCUNHO:
            raise ValidationError("A fatura vinculada já foi emitida/paga/cancelada.")

        fatura.sincronizar_itens_da_origem()

        emit = (request.data or {}).get("emitir", True)
        if emit:
            fatura.emitir()

        return Response(
            {
                "cirurgia_id": cirurgia.id,
                "fatura_id": fatura.id,
                "fatura_codigo": fatura.id_custom,
                "fatura_estado": fatura.estado,
                "total": str(fatura.total),
            },
            status=status.HTTP_200_OK,
        )


class ProcedimentoCirurgicoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SurgicalProcedure.objects.all()
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
