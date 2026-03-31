import logging
from time import perf_counter

logger = logging.getLogger(__name__)


class ExecutionTrackingMixin:
    def track_execution(self, operation_name: str):
        started_at = perf_counter()

        def finish(**extra):
            duration_ms = round((perf_counter() - started_at) * 1000, 2)
            logger.info("%s finished", operation_name, extra={"duration_ms": duration_ms, **extra})

        return finish
"""Mixin para rastrear início/fim de execução e métricas básicas."""
