"""Worker Celery para processar autorizações pendentes com tolerância a falhas."""

import logging
import time

from celery import shared_task
from django.db.utils import OperationalError

from observability.metrics import observe_async_task_duration
from services.insurer.process_authorization_service import ProcessAuthorizationService

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=5,
    autoretry_for=(OperationalError,),
    retry_backoff=True,
    retry_jitter=True,
)
def process_authorization_task(self, authorization_id: int):
    started = time.perf_counter()

    try:
        result = ProcessAuthorizationService.execute(authorization_id)

        logger.info(
            "Authorization processed",
            extra={
                "authorization_id": authorization_id,
                "result": result,
            },
        )
        observe_async_task_duration(
            "authorization:process",
            time.perf_counter() - started,
            status="success",
        )

    except Exception as exc:
        observe_async_task_duration(
            "authorization:process",
            time.perf_counter() - started,
            status="failed",
        )
        logger.exception(
            "Failed to process authorization",
            extra={"authorization_id": authorization_id},
        )

        raise self.retry(exc=exc) from exc


processar_autorizacao_task = process_authorization_task
