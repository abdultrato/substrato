from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction

from ..filters import PaymentFilter, ReceiptFilter, ReconciliationFilter, TransactionFilter
from ..serializers import PaymentSerializer, ReceiptSerializer, ReconciliationSerializer, TransactionSerializer


class PaymentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    filterset_class = PaymentFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "method", "status", "external_reference", "authorization_number"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "invoice",
        "value",
        "method",
        "status",
        "external_reference",
        "insurer",
        "coverage_plan",
        "authorization_number",
        "paid_at",
        "version",
    ]
    ordering = ["-created_at"]


class ReceiptViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    filterset_class = ReceiptFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["number"]
    ordering_fields = ["invoice", "payment", "number", "value", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        tenant = getattr(self.request, "tenant", None)
        if tenant is not None:
            # Receipt has no own tenant field; filter via the related invoice tenant.
            queryset = queryset.filter(invoice__tenant=tenant)
        return queryset

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        receipt = self.get_object()
        from tasks.generate_pdf.receipt_pdf_generator import generate_receipt_pdf

        pdf_bytes, filename = generate_receipt_pdf(receipt, request=request)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp


class ReconciliationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Reconciliation.objects.all()
    serializer_class = ReconciliationSerializer
    filterset_class = ReconciliationFilter
    permission_classes = [IsAuthenticated]
    search_fields = []
    ordering_fields = ["transaction", "confirmed", "confirmation_date", "created_at"]
    ordering = ["-created_at"]


class TransactionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    filterset_class = TransactionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["external_reference", "gateway", "status"]
    ordering_fields = ["external_reference", "gateway", "status", "gateway_response", "created_at"]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "payment": PaymentViewSet,
    "recibo": ReceiptViewSet,
    "reconciliacao": ReconciliationViewSet,
    "transaction": TransactionViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PaymentViewSet",
    "ReceiptViewSet",
    "ReconciliationViewSet",
    "TransactionViewSet",
]

PagamentoViewSet = PaymentViewSet
ReciboViewSet = ReceiptViewSet
ReconciliacaoViewSet = ReconciliationViewSet
TransacaoViewSet = TransactionViewSet
