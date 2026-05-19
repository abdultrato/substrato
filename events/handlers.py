import logging

logger = logging.getLogger("eventos")


class ResultValidatedHandler:
    """
    Handler responsável por reagir ao evento ResultadoValidadoEvent.

    Responsabilidade:
    - Registrar histórico clínico automaticamente
    """

    @staticmethod
    def handle(event) -> None:
        from domain.clinical.handlers.result_validated_handler import ResultValidatedHandler as DomainHandler

        DomainHandler.handle(event)


class AuthorizationRequestedHandler:
    """
    Handler responsável por enfileirar o processamento de autorizações.
    """

    @staticmethod
    def handle(event) -> None:
        try:
            from infrastructure.task_queue import enqueue_task

            enqueue_task(
                "tasks.authorization_worker.process_authorization_task",
                event.autorizacao_id,
                queue="authorization",
                tenant_id=getattr(event, "tenant_id", None),
            )
        except Exception:
            logger.exception(
                "Erro ao enfileirar autorizacao",
                extra={"autorizacao_id": getattr(event, "autorizacao_id", None)},
            )


ResultadoValidadoHandler = ResultValidatedHandler
AutorizacaoSolicitadaHandler = AuthorizationRequestedHandler
