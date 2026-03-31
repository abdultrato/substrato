"""Worker Celery para processar autorizações pendentes com tolerância a falhas."""

import logging

from celery import shared_task
from django.db.utils import OperationalError

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

    try:
        result = ProcessAuthorizationService.execute(authorization_id)

        logger.info(
            "Authorization processed",
            extra={
                "authorization_id": authorization_id,
                "result": result,
            },
        )

    except Exception as exc:
        logger.exception(
            "Failed to process authorization",
            extra={"authorization_id": authorization_id},
        )

        raise self.retry(exc=exc) from exc


processar_autorizacao_task = process_authorization_task
