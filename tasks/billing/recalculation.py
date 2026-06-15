"""Task Celery para recalcular cobranças/faturas em lote."""

import logging
import time

from celery import shared_task
from django.db import transaction

from apps.billing.models.invoice import Invoice
from infrastructure.task_queue import enqueue_task
from observability.metrics import INVOICE_RECALCULATION_DURATION, observe_async_task_duration

logger = logging.getLogger(__name__)


@shared_task(bind=False)
def recalculate_invoice_task(invoice_id: int) -> None:
    """
    Recalcula totais e persiste o status da invoice em background.
    """

    start = time.perf_counter()
    try:
        invoice = Invoice.objects.select_related("patient").get(pk=invoice_id)
    except Invoice.DoesNotExist:
        observe_async_task_duration("billing:invoice_recalculation", time.perf_counter() - start, status="skipped")
        return

    try:
        with transaction.atomic():
            # persist_totals() já chama recalculate_totals() internamente.
            invoice.persist_totals()
    except Exception:
        observe_async_task_duration(
            "billing:invoice_recalculation",
            time.perf_counter() - start,
            status="failed",
            tenant_id=getattr(invoice, "tenant_id", None),
        )
        raise

    duration = time.perf_counter() - start
    tenant_id = getattr(invoice, "tenant_id", None)
    INVOICE_RECALCULATION_DURATION.labels(tenant_id or "unknown").observe(duration)
    observe_async_task_duration(
        "billing:invoice_recalculation",
        duration,
        status="success",
        tenant_id=tenant_id,
    )


@shared_task(bind=True)
def recalculate_invoices(self):
    """Itera invoices pendentes e recalcula totais; reporta tempo total."""
    logger.info("Iniciando recalculo de faturas")

    start = time.perf_counter()

    for invoice in Invoice.objects.filter(status=Invoice.Status.PENDENTE):
        enqueue_task(
            recalculate_invoice_task,
            invoice.id,
            queue="billing",
            tenant_id=getattr(invoice, "tenant_id", None),
        )

    duration = time.perf_counter() - start
    logger.info("Recalculo agendado em %.2fs", duration)
