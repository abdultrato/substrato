from __future__ import annotations

import json

from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from integrations.payments.registry import get_gateway

from .commands import (
    CancelPaymentCommand,
    ConfirmPaymentCommand,
    ConfirmReconciliationCommand,
    FailPaymentCommand,
    ReconcileTransactionCommand,
    RefundPaymentCommand,
    ReopenReconciliationCommand,
    StartPaymentCommand,
    VerifyPaymentCommand,
)

_PAID_STATUSES = {
    "confirmed",
    "paid",
    "success",
    "successful",
    "completed",
    "complete",
    "con",
    "ok",
}


def handle_start_payment(command: StartPaymentCommand) -> Transaction:
    reference = command.reference or f"FAT-{command.invoice.id}"
    gateway = get_gateway(command.gateway_name)

    if gateway.name in {"mpesa", "emola", "mkesh"} and not command.phone:
        raise ValueError("Telefone é obrigatório para pagamentos Mobile Money.")

    if command.idempotent:
        existing = _find_existing_transaction(
            external_reference=reference,
            gateway_name=gateway.name,
        )
        if existing is not None:
            return existing

    response = gateway.charge(command.value, reference, phone=command.phone)

    return Transaction.objects.create(
        external_reference=reference,
        gateway=gateway.name,
        status=str(response.get("status", "pendente")) if isinstance(response, dict) else "pendente",
        gateway_response=_serialize_payload(response),
    )


def handle_verify_payment(command: VerifyPaymentCommand):
    gateway = get_gateway(command.gateway_name or command.transaction.gateway)
    return gateway.status(command.transaction.external_reference)


def handle_reconcile_transaction(command: ReconcileTransactionCommand) -> Transaction:
    transaction = command.transaction
    payload = handle_verify_payment(
        VerifyPaymentCommand(
            transaction=transaction,
            gateway_name=command.gateway_name,
        )
    )

    if isinstance(payload, dict):
        reconciliation, _ = Reconciliation.objects.get_or_create(transaction=transaction)

        updated_fields: list[str] = []
        next_status = str(payload.get("status", transaction.status))
        if transaction.status != next_status:
            transaction.status = next_status
            updated_fields.append("status")

        next_response = _serialize_payload(payload)
        if transaction.gateway_response != next_response:
            transaction.gateway_response = next_response
            updated_fields.append("gateway_response")

        if updated_fields:
            transaction.save(update_fields=updated_fields)

        if command.confirm_when_paid and _is_paid_status(next_status) and not reconciliation.confirmed:
            reconciliation.confirm()

    transaction.refresh_from_db()
    return transaction


def handle_confirm_payment(command: ConfirmPaymentCommand):
    payment = command.payment
    if command.idempotent and payment.status == payment.Status.CONFIRMED:
        return payment

    payment.confirm()
    payment.refresh_from_db()
    return payment


def handle_refund_payment(command: RefundPaymentCommand):
    payment = command.payment
    if command.idempotent and payment.status == payment.Status.REFUNDED:
        return payment

    payment.refund()
    payment.refresh_from_db()
    return payment


def handle_cancel_payment(command: CancelPaymentCommand):
    payment = command.payment
    if command.idempotent and payment.status == payment.Status.CANCELED:
        return payment

    payment.cancel()
    payment.refresh_from_db()
    return payment


def handle_fail_payment(command: FailPaymentCommand):
    payment = command.payment
    if command.idempotent and payment.status == payment.Status.FAILED:
        return payment

    payment.fail()
    payment.refresh_from_db()
    return payment


def handle_confirm_reconciliation(command: ConfirmReconciliationCommand):
    reconciliation = command.reconciliation
    if command.idempotent and reconciliation.confirmed:
        return reconciliation

    reconciliation.confirm()
    reconciliation.refresh_from_db()
    return reconciliation


def handle_reopen_reconciliation(command: ReopenReconciliationCommand):
    reconciliation = command.reconciliation
    if command.idempotent and not reconciliation.confirmed:
        return reconciliation

    reconciliation.reopen()
    reconciliation.refresh_from_db()
    return reconciliation


def _find_existing_transaction(
    *,
    external_reference: str,
    gateway_name: str,
) -> Transaction | None:
    return (
        Transaction.objects.filter(
            external_reference=external_reference,
            gateway=gateway_name,
        )
        .order_by("-created_at", "-id")
        .first()
    )


def _serialize_payload(payload) -> str:
    if payload in (None, ""):
        return ""
    if isinstance(payload, str):
        return payload
    return json.dumps(payload, ensure_ascii=True, default=str)


def _is_paid_status(status: str | None) -> bool:
    return (status or "").strip().lower() in _PAID_STATUSES
