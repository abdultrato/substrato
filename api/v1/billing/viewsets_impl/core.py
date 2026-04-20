from django.core.exceptions import ValidationError as DjangoValidationError
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
    queryset = Invoice.objects.select_related(
        "patient",
        "request",
        "sale",
        "consultation",
        "created_by",
        "created_by__perfil_professional",
    ).prefetch_related(
        "items",
        "items__exam",
        "items__medical_exam",
        "items__consultation__specialty",
    )
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

    @action(detail=True, methods=["post"], url_path="issue", url_name="issue")
    def issue(self, request, pk=None):
        invoice = self.get_object()
        invoice.issue()
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["post"], url_path="void", url_name="void")
    def void(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status != Invoice.Status.CANCELED:
            invoice.status = Invoice.Status.CANCELED
            invoice.save(update_fields=["status"])
            try:
                history_lines = [
                    f"Origem: {invoice.get_origin_display()}",
                    f"Paciente: {getattr(invoice.patient, 'name', '-')}",
                    f"Total com IVA: {getattr(invoice, 'total', 0):.2f}",
                ]
                invoice.register_history("CANCELAMENTO", "Fatura cancelada", linhas=history_lines)
            except Exception:
                pass
        return Response(self.get_serializer(invoice).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="confirm-payment",
        url_name="confirm-payment",
    )
    def confirm_payment(self, request, pk=None):
        invoice = self.get_object()
        invoice = self._confirm_pending_payment(invoice)
        return Response(self.get_serializer(invoice).data)

    def _invoice_payments(self, invoice: Invoice):
        payments_qs = getattr(invoice, "payments", None)
        if payments_qs is None:
            payments_qs = getattr(invoice, "pagamentos", None)
        if payments_qs is None:
            raise ValidationError("Invoice payments relation not available.")
        return payments_qs

    def _confirm_pending_payment(self, invoice: Invoice) -> Invoice:
        payments_qs = self._invoice_payments(invoice)
        payment = payments_qs.filter(status=Payment.Status.PENDING, deleted=False).order_by("-created_at").first()
        if not payment:
            raise ValidationError("No pending payment to confirm.")

        try:
            payment.confirm()
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict) from exc
            raise ValidationError(exc.messages) from exc

        invoice.refresh_from_db()
        return invoice

    @action(
        detail=True,
        methods=["post"],
        url_path="confirm-payment-legacy",
        url_name="confirm-payment-legacy",
    )
    def confirm_payment_legacy(self, request, pk=None):
        invoice = self.get_object()
        invoice = self._confirm_pending_payment(invoice)
        return Response(self.get_serializer(invoice).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="confirmar_pagamento",
        url_name="confirmar_pagamento",
    )
    def confirm_payment_pt(self, request, pk=None):
        """Alias em português para confirmar pagamento pendente."""
        invoice = self.get_object()
        invoice = self._confirm_pending_payment(invoice)
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["post"], url_path="emitir", url_name="emitir")
    def issue_legacy(self, request, pk=None):
        # Legacy Portuguese alias.
        return self.issue(request, pk)

    @action(detail=True, methods=["post"], url_path="anular", url_name="anular")
    def void_legacy(self, request, pk=None):
        # Legacy Portuguese alias.
        return self.void(request, pk)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        pdf_bytes, filename = generate_invoice_pdf(invoice, request=request)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp


class InvoiceItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InvoiceItem.objects.select_related(
        "invoice",
        "exam",
        "medical_exam",
        "consultation__specialty",
        "sale_item__product",
        "procedure_item__catalog",
        "procedure_material__product",
    )
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
    "invoicehistory": InvoiceHistoryViewSet,
    "invoiceitem": InvoiceItemViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "InvoiceHistoryViewSet",
    "InvoiceItemViewSet",
    "InvoiceViewSet",
]
