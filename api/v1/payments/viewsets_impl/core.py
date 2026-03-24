from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction

from ..filters import PagamentoFilter, ReciboFilter, ReconciliacaoFilter, TransacaoFilter
from ..serializers import PagamentoSerializer, ReciboSerializer, ReconciliacaoSerializer, TransacaoSerializer


class PagamentoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PagamentoSerializer
    filterset_class = PagamentoFilter
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


class ReciboViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReciboSerializer
    filterset_class = ReciboFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["numero"]
    ordering_fields = ["fatura", "pagamento", "numero", "valor", "criado_em"]
    ordering = ["-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            # Recibo não tem campo inquilino próprio; filtra pelo inquilino da fatura.
            queryset = queryset.filter(fatura__inquilino=inquilino)
        return queryset

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        recibo = self.get_object()
        from tasks.gerar_pdf.pdf_generator_recibo import gerar_pdf_recibo

        pdf_bytes, filename = gerar_pdf_recibo(recibo, request=request)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp


class ReconciliacaoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Reconciliation.objects.all()
    serializer_class = ReconciliacaoSerializer
    filterset_class = ReconciliacaoFilter
    permission_classes = [IsAuthenticated]
    search_fields = []
    ordering_fields = ["transacao", "confirmado", "data_confirmacao", "criado_em"]
    ordering = ["-criado_em"]


class TransacaoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransacaoSerializer
    filterset_class = TransacaoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["referencia_externa", "gateway", "status"]
    ordering_fields = ["referencia_externa", "gateway", "status", "resposta_gateway", "criado_em"]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "pagamento": PagamentoViewSet,
    "recibo": ReciboViewSet,
    "reconciliacao": ReconciliacaoViewSet,
    "transacao": TransacaoViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PagamentoViewSet",
    "ReciboViewSet",
    "ReconciliacaoViewSet",
    "TransacaoViewSet",
]
