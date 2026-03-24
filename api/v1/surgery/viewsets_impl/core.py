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

from ..filters import SurgeryFilter, SurgicalProcedureFilter
from ..serializers import SurgicalProcedureSerializer, SurgerySerializer


class SurgeryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Surgery.objects.select_related("paciente", "cirurgiao").prefetch_related("procedimentos").all()
    serializer_class = SurgerySerializer
    filterset_class = SurgeryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "procedimento", "paciente__nome", "cirurgiao__username"]
    ordering_fields = ["agendada_para", "criado_em", "estado"]
    ordering = ["-agendada_para", "-criado_em"]

    @action(detail=True, methods=["post"], url_path="criar_fatura", url_name="criar-fatura")
    def create_invoice(self, request, pk=None):
        surgery = self.get_object()

        if hasattr(surgery, "fatura") and getattr(surgery, "fatura", None):
            invoice = surgery.fatura
        else:
            invoice = Invoice(
                inquilino=surgery.inquilino,
                origem=Invoice.Origem.CIRURGIA,
                cirurgia=surgery,
                paciente=surgery.paciente,
            )
            invoice.full_clean()
            invoice.save()

        if invoice.estado != Invoice.Estado.RASCUNHO:
            raise ValidationError("A fatura vinculada já foi emitida/paga/cancelada.")

        invoice.sincronizar_itens_da_origem()

        emit = (request.data or {}).get("emitir", True)
        if emit:
            invoice.emitir()

        return Response(
            {
                "cirurgia_id": surgery.id,
                "fatura_id": invoice.id,
                "fatura_codigo": invoice.id_custom,
                "fatura_estado": invoice.estado,
                "total": str(invoice.total),
            },
            status=status.HTTP_200_OK,
        )


class SurgicalProcedureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SurgicalProcedure.objects.all()
    serializer_class = SurgicalProcedureSerializer
    filterset_class = SurgicalProcedureFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "descricao"]
    ordering_fields = ["nome", "ativo", "criado_em"]
    ordering = ["nome"]


VIEWSET_MAP = {
    "cirurgia": SurgeryViewSet,
    "procedimentocirurgico": SurgicalProcedureViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "SurgeryViewSet",
    "SurgicalProcedureViewSet",
]

CirurgiaViewSet = SurgeryViewSet
ProcedimentoCirurgicoViewSet = SurgicalProcedureViewSet
