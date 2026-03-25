from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.billing.models.invoice_items import InvoiceItem
from apps.payments.models.payment import Payment
from tasks.generate_pdf.invoice_pdf_generator import generate_invoice_pdf

from ..filters import InvoiceFilter, InvoiceHistoryFilter, InvoiceItemFilter
from ..serializers import InvoiceHistorySerializer, InvoiceItemSerializer, InvoiceSerializer


class InvoiceViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    filterset_class = InvoiceFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__custom_id",
        "patient__name",
        "request__custom_id",
        "consultation__custom_id",
        "sale__number",
        "status",
        "origin",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "request",
        "patient",
        "consultation",
        "sale",
        "origin",
        "subtotal",
        "vat_amount",
        "total",
        "insurance_amount",
        "patient_amount",
        "status",
        "version",
    ]
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"])
    @action(detail=True, methods=["post"], url_path="emitir", url_name="emitir")
    def issue(self, request, pk=None):
        invoice = self.get_object()
        invoice.emitir()
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["post"], url_path="anular", url_name="anular")
    def void(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status != Invoice.Estado.CANCELADA:
            invoice.status = Invoice.Estado.CANCELADA
            invoice.save(update_fields=["status"])
            try:
                history_lines = [
                    f"Origem: {invoice.get_origin_display()}",
                    f"Paciente: {getattr(invoice.patient, 'name', '-')}",
                    f"Total com IVA: {getattr(invoice, 'total', 0):.2f}",
                ]
                invoice.registrar_historico("CANCELAMENTO", "Fatura cancelada", linhas=history_lines)
            except Exception:
                pass
        return Response(self.get_serializer(invoice).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="confirmar_payment",
        url_name="confirmar_payment",
    )
    def confirm_payment(self, request, pk=None):
        invoice = self.get_object()
        payment = (
            invoice.pagamentos.filter(status=Payment.Status.PENDENTE, deleted=False)
            .order_by("-created_at")
            .first()
        )
        if not payment:
            raise ValidationError("Nenhum payment pendente para confirmar.")

        try:
            payment.confirm()
        except ValidationError as exc:
            raise ValidationError(str(exc)) from exc

        invoice.refresh_from_db()
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        pdf_bytes, filename = generate_invoice_pdf(invoice, request=request)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp


class InvoiceItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InvoiceItem.objects.all()
    serializer_class = InvoiceItemSerializer
    filterset_class = InvoiceItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "description",
        "invoice__custom_id",
        "exam__name",
        "medical_exam__name",
        "sale_item__name",
        "item_type",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "invoice",
        "exam",
        "medical_exam",
        "sale_item",
        "procedure_item",
        "procedure_material",
        "description",
        "quantity",
        "unit_price",
        "vat_percentage",
        "item_type",
        "version",
    ]
    ordering = ["-created_at"]


class InvoiceHistoryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InvoiceHistory.objects.all()
    serializer_class = InvoiceHistorySerializer
    filterset_class = InvoiceHistoryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["description", "event_type"]
    ordering_fields = ["invoice", "description", "event_type", "created_at"]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "invoice": InvoiceViewSet,
    "faturaitem": InvoiceItemViewSet,
    "historicofatura": InvoiceHistoryViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "InvoiceHistoryViewSet",
    "InvoiceItemViewSet",
    "InvoiceViewSet",
]
