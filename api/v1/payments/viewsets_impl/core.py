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
    search_fields = ["id_custom", "nome", "metodo", "status", "referencia_externa", "numero_autorizacao"]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "fatura",
        "valor",
        "metodo",
        "status",
        "referencia_externa",
        "seguradora",
        "plano_cobertura",
        "numero_autorizacao",
        "pago_em",
        "versao",
    ]
    ordering = ["-criado_em"]


class ReceiptViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    filterset_class = ReceiptFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["numero"]
    ordering_fields = ["fatura", "pagamento", "numero", "valor", "criado_em"]
    ordering = ["-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            # Receipt has no own tenant field; filter via the related invoice tenant.
            queryset = queryset.filter(fatura__inquilino=inquilino)
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
    ordering_fields = ["transacao", "confirmado", "data_confirmacao", "criado_em"]
    ordering = ["-criado_em"]


class TransactionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    filterset_class = TransactionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["referencia_externa", "gateway", "status"]
    ordering_fields = ["referencia_externa", "gateway", "status", "resposta_gateway", "criado_em"]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "pagamento": PaymentViewSet,
    "recibo": ReceiptViewSet,
    "reconciliacao": ReconciliationViewSet,
    "transacao": TransactionViewSet,
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
