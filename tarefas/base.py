import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class TaskBase:
    """
    Base simples para tarefas agendadas / cron.
    """

    name = "task"

    @classmethod
    def log_inicio(cls):
        logger.info(f"[{cls.name}] iniciado em {datetime.now()}")

    @classmethod
    def log_fim(cls):
        logger.info(f"[{cls.name}] finalizado em {datetime.now()}")

    @classmethod
    def executar(cls, func, *args, **kwargs):
        cls.log_inicio()
        try:
            return func(*args, **kwargs)
        finally:
            cls.log_fim()
