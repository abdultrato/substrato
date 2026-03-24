import logging
import time

import logging
import time

from celery import shared_task
from django.db import transaction

from apps.billing.models.invoice import Invoice
from observability.metricas import FATURA_RECALCULO_DURATION

@shared_task(bind=False)
def recalcular_fatura_task(fatura_id: int) -> None:
    """
    Recalcula totais e persiste o estado da fatura em background.
    """

    start = time.perf_counter()
    try:
        fatura = Invoice.objects.select_related("paciente").get(pk=fatura_id)
    except Invoice.DoesNotExist:
        return

    with transaction.atomic():
        fatura.recalcular_totais()
        fatura.persistir_totais()

    duration = time.perf_counter() - start
    millis = duration * 1000
    tenant_id = getattr(fatura, "inquilino_id", None)
    FATURA_RECALCULO_DURATION.labels(tenant_id or "unknown").observe(duration)
