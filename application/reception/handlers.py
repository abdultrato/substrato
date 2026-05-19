from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError

from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt

from .commands import (
    CreateInvoiceForCheckinCommand,
    CreateRequestForCheckinCommand,
    ExecuteFullFlowCommand,
    LinkInvoiceToCheckinCommand,
    LinkRequestToCheckinCommand,
    OpenCheckinCommand,
    RegisterPaymentForCheckinCommand,
)


def handle_open_checkin(command: OpenCheckinCommand):
    from .care_flow import open_checkin

    return open_checkin(
        tenant=command.tenant,
        patient=command.patient,
        priority=command.priority,
        reason=command.reason,
        notes=command.notes,
        attendant=command.attendant,
    )


def handle_create_request_for_checkin(command: CreateRequestForCheckinCommand):
    from .care_flow import create_request_for_checkin

    if command.idempotent and command.checkin.request_id:
        return command.checkin.request

    return create_request_for_checkin(
        checkin=command.checkin,
        exam_ids=command.exam_ids,
        clinical_status=command.clinical_status,
    )


def handle_create_invoice_for_checkin(command: CreateInvoiceForCheckinCommand):
    from .care_flow import create_invoice_for_checkin

    if command.idempotent and command.checkin.invoice_id:
        return command.checkin.invoice

    return create_invoice_for_checkin(
        checkin=command.checkin,
        issue=command.issue,
        **command.legacy_kwargs,
    )


def handle_register_payment_for_checkin(command: RegisterPaymentForCheckinCommand):
    from .care_flow import register_payment_for_checkin

    if command.idempotent:
        existing = _find_existing_payment(command)
        if existing is not None:
            receipt = (
                Receipt.objects.filter(payment=existing)
                .order_by("-created_at", "-id")
                .first()
            )
            return existing, receipt

    return register_payment_for_checkin(
        checkin=command.checkin,
        value=command.value,
        method=command.method,
        external_reference=command.external_reference,
        insurer_id=command.insurer_id,
        coverage_plan_id=command.coverage_plan_id,
        authorization_number=command.authorization_number,
        insurance_date=command.insurance_date,
        confirm=command.confirm,
        **command.legacy_kwargs,
    )


def handle_link_request_to_checkin(command: LinkRequestToCheckinCommand):
    if command.checkin.request_id:
        if command.checkin.request_id == command.request_id:
            return command.checkin.request
        raise ValidationError("Check-in já possui requisição vinculada.")

    request_obj = LabRequest.objects.filter(
        tenant=command.tenant,
        pk=command.request_id,
    ).first()
    if not request_obj:
        raise ValidationError({"request_id": "Requisição não encontrada para este tenant."})

    command.checkin.register_request(request_obj)
    return request_obj


def handle_link_invoice_to_checkin(command: LinkInvoiceToCheckinCommand):
    if command.checkin.invoice_id:
        if command.checkin.invoice_id == command.invoice_id:
            return command.checkin.invoice
        raise ValidationError("Check-in já possui fatura vinculada.")

    invoice = Invoice.objects.filter(
        tenant=command.tenant,
        pk=command.invoice_id,
    ).first()
    if not invoice:
        raise ValidationError({"invoice_id": "Fatura não encontrada para este tenant."})

    command.checkin.register_invoice(invoice)
    return invoice


def handle_execute_full_flow(command: ExecuteFullFlowCommand):
    from .care_flow import execute_full_flow

    return execute_full_flow(
        tenant=command.tenant,
        user=command.user,
        patient_id=command.patient_id,
        patient=command.patient,
        checkin=command.checkin,
        request=command.request,
        billing=command.billing,
        payment=command.payment,
        complete_checkin=command.complete_checkin,
        faturamento=command.faturamento,
        concluir_checkin=command.concluir_checkin,
    )


def _find_existing_payment(command: RegisterPaymentForCheckinCommand) -> Payment | None:
    invoice = command.checkin.invoice
    if invoice is None:
        return None

    external_reference = (command.external_reference or "").strip()
    if not external_reference:
        return None

    queryset = invoice.pagamentos.filter(
        external_reference=external_reference,
        method=command.method,
    ).order_by("-created_at", "-id")

    if command.value is not None:
        try:
            value = Decimal(command.value).quantize(Decimal("0.01"))
        except Exception:
            value = None
        if value is not None:
            queryset = queryset.filter(value=value)

    return queryset.first()

