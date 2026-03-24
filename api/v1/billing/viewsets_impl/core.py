from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.billing.models.invoice_history import InvoiceHistory
from tasks.generate_pdf.invoice_pdf_generator import generate_invoice_pdf

from apps.payments.models.payment import Payment
from ..filters import InvoiceFilter, InvoiceHistoryFilter, InvoiceItemFilter
from ..serializers import InvoiceHistorySerializer, InvoiceItemSerializer, InvoiceSerializer


class InvoiceViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    filterset_class = InvoiceFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "paciente__id_custom",
        "paciente__nome",
        "requisicao__id_custom",
        "consulta__id_custom",
        "venda__numero",
        "estado",
        "origem",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "requisicao",
        "paciente",
        "consulta",
        "venda",
        "origem",
        "subtotal",
        "iva_valor",
        "total",
        "valor_seguro",
        "valor_paciente",
        "estado",
        "versao",
    ]
    ordering = ["-criado_em"]

    @action(detail=True, methods=["post"])
    @action(detail=True, methods=["post"], url_path="emitir", url_name="emitir")
    def issue(self, request, pk=None):
        invoice = self.get_object()
        invoice.emitir()
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["post"], url_path="anular", url_name="anular")
    def void(self, request, pk=None):
        invoice = self.get_object()
        if invoice.estado != Invoice.Estado.CANCELADA:
            invoice.estado = Invoice.Estado.CANCELADA
            invoice.save(update_fields=["estado"])
            try:
                history_lines = [
                    f"Origem: {invoice.get_origem_display()}",
                    f"Paciente: {getattr(invoice.paciente, 'nome', '-')}",
                    f"Total com IVA: {getattr(invoice, 'total', 0):.2f}",
                ]
                invoice.registrar_historico("CANCELAMENTO", "Fatura cancelada", linhas=history_lines)
            except Exception:
                pass
        return Response(self.get_serializer(invoice).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="confirmar_pagamento",
        url_name="confirmar_pagamento",
    )
    def confirm_payment(self, request, pk=None):
        invoice = self.get_object()
        payment = (
            invoice.pagamentos.filter(status=Payment.Status.PENDENTE, deletado=False)
            .order_by("-criado_em")
            .first()
        )
        if not payment:
            raise ValidationError("Nenhum pagamento pendente para confirmar.")

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
        "id_custom",
        "descricao",
        "fatura__id_custom",
        "exame__nome",
        "exame_medico__nome",
        "item_venda__nome",
        "tipo_item",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "fatura",
        "exame",
        "exame_medico",
        "item_venda",
        "procedimento_item",
        "procedimento_material",
        "descricao",
        "quantidade",
        "preco_unitario",
        "iva_percentual",
        "tipo_item",
        "versao",
    ]
    ordering = ["-criado_em"]


class InvoiceHistoryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InvoiceHistory.objects.all()
    serializer_class = InvoiceHistorySerializer
    filterset_class = InvoiceHistoryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["descricao", "tipo_evento"]
    ordering_fields = ["fatura", "descricao", "tipo_evento", "criado_em"]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "fatura": InvoiceViewSet,
    "faturaitem": InvoiceItemViewSet,
    "historicofatura": InvoiceHistoryViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "InvoiceHistoryViewSet",
    "InvoiceItemViewSet",
    "InvoiceViewSet",
]
