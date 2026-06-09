"""ViewSets da API v1 para pagamentos/recibos/reconciliações/transações."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.utils.async_exports import queue_export_if_requested
from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from application.payments.commands import (
    CancelPaymentCommand,
    ConfirmPaymentCommand,
    ConfirmReconciliationCommand,
    FailPaymentCommand,
    ReconcileTransactionCommand,
    RefundPaymentCommand,
    VerifyPaymentCommand,
)
from application.payments.handlers import (
    handle_cancel_payment,
    handle_confirm_payment,
    handle_confirm_reconciliation,
    handle_fail_payment,
    handle_reconcile_transaction,
    handle_refund_payment,
    handle_verify_payment,
)
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

    def _execute_command(self, handler, command):
        try:
            return handler(command)
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict) from exc
            raise ValidationError(exc.messages) from exc
        except Exception as exc:
            raise ValidationError(str(exc)) from exc

    @action(detail=True, methods=["post"], url_path="confirm", url_name="confirm")
    def confirm(self, request, pk=None):
        payment = self._execute_command(
            handle_confirm_payment,
            ConfirmPaymentCommand(
                payment=self.get_object(),
                idempotent=True,
            ),
        )
        return Response(self.get_serializer(payment).data)

    @action(detail=True, methods=["post"], url_path="refund", url_name="refund")
    def refund(self, request, pk=None):
        payment = self._execute_command(
            handle_refund_payment,
            RefundPaymentCommand(
                payment=self.get_object(),
                idempotent=True,
            ),
        )
        return Response(self.get_serializer(payment).data)

    @action(detail=True, methods=["post"], url_path="cancel", url_name="cancel")
    def cancel(self, request, pk=None):
        payment = self._execute_command(
            handle_cancel_payment,
            CancelPaymentCommand(
                payment=self.get_object(),
                idempotent=True,
            ),
        )
        return Response(self.get_serializer(payment).data)

    @action(detail=True, methods=["post"], url_path="fail", url_name="fail")
    def fail(self, request, pk=None):
        payment = self._execute_command(
            handle_fail_payment,
            FailPaymentCommand(
                payment=self.get_object(),
                idempotent=True,
            ),
        )
        return Response(self.get_serializer(payment).data)


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
        queued = queue_export_if_requested(
            request,
            export_key="receipt_pdf",
            payload={"receipt_id": receipt.id},
            content_disposition="inline",
        )
        if queued is not None:
            return queued

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

    def _execute_command(self, handler, command):
        try:
            return handler(command)
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict) from exc
            raise ValidationError(exc.messages) from exc
        except Exception as exc:
            raise ValidationError(str(exc)) from exc

    @action(detail=True, methods=["post"], url_path="confirm", url_name="confirm")
    def confirm(self, request, pk=None):
        reconciliation = self._execute_command(
            handle_confirm_reconciliation,
            ConfirmReconciliationCommand(
                reconciliation=self.get_object(),
                idempotent=True,
            ),
        )
        return Response(self.get_serializer(reconciliation).data)


class TransactionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    filterset_class = TransactionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["external_reference", "gateway", "status"]
    ordering_fields = ["external_reference", "gateway", "status", "gateway_response", "created_at"]
    ordering = ["-created_at"]

    def _execute_command(self, handler, command):
        try:
            return handler(command)
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict) from exc
            raise ValidationError(exc.messages) from exc
        except Exception as exc:
            raise ValidationError(str(exc)) from exc

    @staticmethod
    def _to_bool(value, default: bool) -> bool:
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        text = str(value).strip().lower()
        if text in {"1", "true", "t", "yes", "y", "sim"}:
            return True
        if text in {"0", "false", "f", "no", "n", "nao", "não"}:
            return False
        return default

    def _gateway_name(self, request):
        payload = request.data or {}
        return (
            payload.get("gateway_name")
            or payload.get("gateway")
            or request.query_params.get("gateway_name")
            or request.query_params.get("gateway")
        )

    @action(detail=True, methods=["post"], url_path="verify", url_name="verify")
    def verify(self, request, pk=None):
        transaction = self.get_object()
        payload = self._execute_command(
            handle_verify_payment,
            VerifyPaymentCommand(
                transaction=transaction,
                gateway_name=self._gateway_name(request),
            ),
        )
        transaction.refresh_from_db()
        return Response(
            {
                "transaction": self.get_serializer(transaction).data,
                "gateway_payload": payload,
            }
        )

    @action(detail=True, methods=["post"], url_path="verificar", url_name="verificar")
    def verificar(self, request, pk=None):
        return self.verify(request, pk=pk)

    @action(detail=True, methods=["post"], url_path="reconcile", url_name="reconcile")
    def reconcile(self, request, pk=None):
        payload = request.data or {}
        confirm_when_paid = self._to_bool(
            payload.get("confirm_when_paid", request.query_params.get("confirm_when_paid")),
            default=True,
        )

        transaction = self._execute_command(
            handle_reconcile_transaction,
            ReconcileTransactionCommand(
                transaction=self.get_object(),
                gateway_name=self._gateway_name(request),
                confirm_when_paid=confirm_when_paid,
                idempotent=True,
            ),
        )

        reconciliation = Reconciliation.objects.filter(transaction=transaction).first()
        reconciliation_payload = None
        if reconciliation is not None:
            reconciliation_payload = {
                "id": reconciliation.id,
                "confirmed": reconciliation.confirmed,
                "confirmation_date": (
                    reconciliation.confirmation_date.isoformat() if reconciliation.confirmation_date else None
                ),
            }

        return Response(
            {
                "transaction": self.get_serializer(transaction).data,
                "reconciliation": reconciliation_payload,
            }
        )

    @action(detail=True, methods=["post"], url_path="reconciliar", url_name="reconciliar")
    def reconciliar(self, request, pk=None):
        return self.reconcile(request, pk=pk)


VIEWSET_MAP = {
    "payment": PaymentViewSet,
    "receipt": ReceiptViewSet,
    "reconciliation": ReconciliationViewSet,
    "transaction": TransactionViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PaymentViewSet",
    "ReceiptViewSet",
    "ReconciliationViewSet",
    "TransactionViewSet",
]
