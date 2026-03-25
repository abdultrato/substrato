from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.billing.models.invoice import Invoice
from apps.surgery.models.surgery import Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure

from ..filters import SurgeryFilter, SurgicalProcedureFilter
from ..serializers import SurgerySerializer, SurgicalProcedureSerializer


class SurgeryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Surgery.objects.select_related("patient", "surgeon").prefetch_related("procedures").all()
    serializer_class = SurgerySerializer
    filterset_class = SurgeryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "procedure", "patient__name", "surgeon__username"]
    ordering_fields = ["scheduled_for", "created_at", "status"]
    ordering = ["-scheduled_for", "-created_at"]

    @action(detail=True, methods=["post"], url_path="criar_invoice", url_name="criar-invoice")
    def create_invoice(self, request, pk=None):
        surgery = self.get_object()

        if hasattr(surgery, "invoice") and getattr(surgery, "invoice", None):
            invoice = surgery.invoice
        else:
            invoice = Invoice(
                tenant=surgery.tenant,
                origin=Invoice.Origin.SURGERY,
                surgery=surgery,
                patient=surgery.patient,
            )
            invoice.full_clean()
            invoice.save()

        if invoice.status != Invoice.Status.DRAFT:
            raise ValidationError("A invoice vinculada já foi emitida/paga/cancelada.")

        invoice.sync_items_from_origin()

        emit = (request.data or {}).get("emitir", True)
        if emit:
            invoice.issue()

        return Response(
            {
                "surgery_id": surgery.id,
                "invoice_id": invoice.id,
                "invoice_code": invoice.custom_id,
                "invoice_status": invoice.status,
                "total": str(invoice.total),
            },
            status=status.HTTP_200_OK,
        )


class SurgicalProcedureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SurgicalProcedure.objects.all()
    serializer_class = SurgicalProcedureSerializer
    filterset_class = SurgicalProcedureFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description"]
    ordering_fields = ["name", "active", "created_at"]
    ordering = ["name"]


VIEWSET_MAP = {
    "surgery": SurgeryViewSet,
    "procedimentocirurgico": SurgicalProcedureViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "SurgeryViewSet",
    "SurgicalProcedureViewSet",
]

