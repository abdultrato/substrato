import logging
from celery import shared_task
from django.db.utils import OperationalError
from servicos.seguradora.processar_autorizacao_service import (
	ProcessarAutorizacaoService
	)

logger = logging.getLogger(__name__)


@shared_task(
		bind = True,
		max_retries = 5,
		autoretry_for = (OperationalError,),
		retry_backoff = True,
		retry_jitter = True,
		)
def processar_autorizacao_task(self, autorizacao_id: int):
	
	try:
		resultado = ProcessarAutorizacaoService.executar(
				autorizacao_id
				)
		
		logger.info(
				"Autorizacao processada",
				extra = {
						"autorizacao_id": autorizacao_id,
						"resultado"     : resultado,
						},
				)
	
	except Exception as exc:
		
		logger.exception(
				"Erro ao processar autorizacao",
				extra = {"autorizacao_id": autorizacao_id},
				)
		
		raise self.retry(exc = exc)
