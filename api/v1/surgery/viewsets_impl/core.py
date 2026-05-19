"""ViewSets da API v1 para cirurgias e catálogo cirúrgico."""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.billing.models.invoice import Invoice
from apps.surgery.models.surgery import LargeSurgery, SmallSurgery, Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure

from ..filters import LargeSurgeryFilter, SmallSurgeryFilter, SurgeryFilter, SurgicalProcedureFilter
from ..serializers import (
    LargeSurgerySerializer,
    SmallSurgerySerializer,
    SurgerySerializer,
    SurgicalProcedureSerializer,
)


class BaseSurgeryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    fixed_surgery_size: str | None = None
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "procedure", "patient__name", "surgeon__username", "surgery_size"]
    ordering_fields = ["scheduled_for", "created_at", "status", "surgery_size"]
    ordering = ["-scheduled_for", "-created_at"]

    def perform_create(self, serializer):
        if self.fixed_surgery_size:
            serializer.save(surgery_size=self.fixed_surgery_size)
            return
        serializer.save()

    def perform_update(self, serializer):
        if self.fixed_surgery_size:
            serializer.save(surgery_size=self.fixed_surgery_size)
            return
        serializer.save()

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


class SurgeryViewSet(BaseSurgeryViewSet):
    queryset = Surgery.objects.select_related("patient", "surgeon").prefetch_related("procedures").all()
    serializer_class = SurgerySerializer
    filterset_class = SurgeryFilter


class SmallSurgeryViewSet(BaseSurgeryViewSet):
    queryset = SmallSurgery.objects.select_related("patient", "surgeon").prefetch_related("procedures").all()
    serializer_class = SmallSurgerySerializer
    filterset_class = SmallSurgeryFilter
    fixed_surgery_size = Surgery.Size.SMALL


class LargeSurgeryViewSet(BaseSurgeryViewSet):
    queryset = LargeSurgery.objects.select_related("patient", "surgeon").prefetch_related("procedures").all()
    serializer_class = LargeSurgerySerializer
    filterset_class = LargeSurgeryFilter
    fixed_surgery_size = Surgery.Size.LARGE


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
    "pequenacirurgia": SmallSurgeryViewSet,
    "grandecirurgia": LargeSurgeryViewSet,
    "procedimentocirurgico": SurgicalProcedureViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "BaseSurgeryViewSet",
    "LargeSurgeryViewSet",
    "SmallSurgeryViewSet",
    "SurgeryViewSet",
    "SurgicalProcedureViewSet",
]

