import logging
import time

from celery import shared_task
from django.db import transaction

from apps.billing.models.invoice import Invoice
from observability.metrics import INVOICE_RECALCULATION_DURATION

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
        return

    with transaction.atomic():
        invoice.recalcular_totais()
        invoice.persistir_totais()

    duration = time.perf_counter() - start
    tenant_id = getattr(invoice, "tenant_id", None)
    INVOICE_RECALCULATION_DURATION.labels(tenant_id or "unknown").observe(duration)
