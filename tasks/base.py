import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


class TaskBase:
    """
    Base simples para tarefas agendadas / cron.
    """

    name = "task"

    @classmethod
    def log_start(cls):
        logger.info("[%s] iniciado em %s", cls.name, timezone.now())

    @classmethod
    def log_end(cls):
        logger.info("[%s] finalized em %s", cls.name, timezone.now())

    @classmethod
    def execute(cls, func, *args, **kwargs):
        cls.log_start()
        try:
            return func(*args, **kwargs)
        finally:
            cls.log_end()
