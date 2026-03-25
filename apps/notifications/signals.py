from decimal import Decimal

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.billing.models.invoice import Invoice
from apps.clinical.models.result_item import ResultItem
from apps.payments.models.receipt import Receipt
from domain.clinical.result_state import ResultState

from .models.notification import Notification
from .services import NotificationService


def _resolve_invoice_patient(invoice):
    patient = getattr(invoice, "patient", None)
    if patient:
        return patient

    origin = getattr(invoice, "origin", None)
    if origin == Invoice.Origin.CLINICAL:
        request = getattr(invoice, "request", None)
        return getattr(request, "patient", None)

    if origin == Invoice.Origin.NURSING:
        procedure = getattr(invoice, "procedure", None)
        return getattr(procedure, "patient", None)

    return None


@receiver(
    post_save,
    sender=ResultItem,
    dispatch_uid="notificacoes.result_disponivel",
)
def notify_result(sender, instance, created, **kwargs):
    if instance.status != ResultState.VALIDATED:
        return

    # Notify only after the last result item is validated.
    if instance.result.itens.exclude(status=ResultState.VALIDATED).exists():
        return

    patient = instance.result.request.patient
    if not patient:
        return

    request_code = instance.result.request.custom_id or instance.result.request_id
    result_code = instance.result.custom_id or instance.result_id
    subject = "Resultado disponível"
    message = f"Seu result {result_code} da requisição {request_code} já está disponível para consultation."

    NotificationService().send_to_patient(
        patient=patient,
        subject=subject,
        message=message,
        event_type=Notification.EventType.RESULTADO_DISPONIVEL,
        external_reference=f"result:{instance.result_id}:validado",
    )


@receiver(
    post_save,
    sender=Invoice,
    dispatch_uid="notificacoes.invoice_emitida",
)
def notify_invoice_issued(sender, instance, created, **kwargs):
    if instance.status != Invoice.Status.ISSUED:
        return

    patient = _resolve_invoice_patient(instance)
    if not patient:
        return

    invoice_code = instance.custom_id or instance.pk
    total_amount = instance.total or Decimal("0.00")
    subject = "Fatura emitida"
    message = f"A sua invoice {invoice_code} foi emitida. Valor total: {total_amount:.2f}."

    NotificationService().send_to_patient(
        patient=patient,
        subject=subject,
        message=message,
        event_type=Notification.EventType.FATURA_EMITIDA,
        external_reference=f"invoice:{instance.pk}:emitida",
    )


@receiver(
    post_save,
    sender=Receipt,
    dispatch_uid="notificacoes.recibo_gerado",
)
def notify_receipt_generated(sender, instance, created, **kwargs):
    if not created:
        return

    patient = _resolve_invoice_patient(instance.invoice)
    if not patient:
        return

    invoice_code = instance.invoice.custom_id or instance.invoice_id
    subject = "Recibo disponível"
    message = (
        f"Seu recibo {instance.number} foi gerado para a invoice {invoice_code}. Valor recebido: {instance.value:.2f}."
    )

    NotificationService().send_to_patient(
        patient=patient,
        subject=subject,
        message=message,
        event_type=Notification.EventType.RECIBO_GERADO,
        external_reference=f"recibo:{instance.pk}:gerado",
    )


_resolver_patient_invoice = _resolve_invoice_patient
notificar_result = notify_result
notificar_invoice_emitida = notify_invoice_issued
notificar_recibo_gerado = notify_receipt_generated
