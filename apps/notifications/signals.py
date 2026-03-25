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
    patient = getattr(invoice, "paciente", None)
    if patient:
        return patient

    origin = getattr(invoice, "origem", None)
    if origin == Invoice.Origem.CLINICO:
        request = getattr(invoice, "requisicao", None)
        return getattr(request, "paciente", None)

    if origin == Invoice.Origem.ENFERMAGEM:
        procedure = getattr(invoice, "procedimento", None)
        return getattr(procedure, "paciente", None)

    return None


@receiver(
    post_save,
    sender=ResultItem,
    dispatch_uid="notificacoes.resultado_disponivel",
)
def notify_result(sender, instance, created, **kwargs):
    if instance.estado != ResultState.VALIDATED:
        return

    # Notify only after the last result item is validated.
    if instance.resultado.itens.exclude(estado=ResultState.VALIDATED).exists():
        return

    patient = instance.resultado.requisicao.paciente
    if not patient:
        return

    request_code = instance.resultado.requisicao.id_custom or instance.resultado.requisicao_id
    result_code = instance.resultado.id_custom or instance.resultado_id
    subject = "Resultado disponível"
    message = f"Seu resultado {result_code} da requisição {request_code} já está disponível para consulta."

    NotificationService().send_to_patient(
        patient=patient,
        subject=subject,
        message=message,
        event_type=Notification.EventType.RESULTADO_DISPONIVEL,
        referencia_externa=f"resultado:{instance.resultado_id}:validado",
    )


@receiver(
    post_save,
    sender=Invoice,
    dispatch_uid="notificacoes.fatura_emitida",
)
def notify_invoice_issued(sender, instance, created, **kwargs):
    if instance.estado != Invoice.Estado.EMITIDA:
        return

    patient = _resolve_invoice_patient(instance)
    if not patient:
        return

    invoice_code = instance.id_custom or instance.pk
    total_amount = instance.total or Decimal("0.00")
    subject = "Fatura emitida"
    message = f"A sua fatura {invoice_code} foi emitida. Valor total: {total_amount:.2f}."

    NotificationService().send_to_patient(
        patient=patient,
        subject=subject,
        message=message,
        event_type=Notification.EventType.FATURA_EMITIDA,
        referencia_externa=f"fatura:{instance.pk}:emitida",
    )


@receiver(
    post_save,
    sender=Receipt,
    dispatch_uid="notificacoes.recibo_gerado",
)
def notify_receipt_generated(sender, instance, created, **kwargs):
    if not created:
        return

    patient = _resolve_invoice_patient(instance.fatura)
    if not patient:
        return

    invoice_code = instance.fatura.id_custom or instance.fatura_id
    subject = "Recibo disponível"
    message = (
        f"Seu recibo {instance.numero} foi gerado para a fatura {invoice_code}. Valor recebido: {instance.valor:.2f}."
    )

    NotificationService().send_to_patient(
        patient=patient,
        subject=subject,
        message=message,
        event_type=Notification.EventType.RECIBO_GERADO,
        referencia_externa=f"recibo:{instance.pk}:gerado",
    )


_resolver_paciente_fatura = _resolve_invoice_patient
notificar_resultado = notify_result
notificar_fatura_emitida = notify_invoice_issued
notificar_recibo_gerado = notify_receipt_generated
