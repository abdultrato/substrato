import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


class TaskBase:
    """
    Base simples para tarefas agendadas / cron.
    """

    name = "task"

    @classmethod
    def log_inicio(cls):
        logger.info("[%s] iniciado em %s", cls.name, timezone.now())

    @classmethod
    def log_fim(cls):
        logger.info("[%s] finalizado em %s", cls.name, timezone.now())

    @classmethod
    def executar(cls, func, *args, **kwargs):
        cls.log_inicio()
        try:
            return func(*args, **kwargs)
        finally:
            cls.log_fim()
