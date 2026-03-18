from functools import wraps
import logging
import time

from django.conf import settings
from django.db import connection

logger = logging.getLogger("metrics")

# =========================================================
# TIMER CONTEXT MANAGER
# =========================================================


class Timer:
    """
    Context manager que mede a duração de um bloco.
    Atributo: duration (segundos).
    """

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.duration = time.perf_counter() - self.start


# =========================================================
# FUNCTION EXECUTION TIMER
# =========================================================


def measure_time(label: str):
    """
    Decorator que registra o tempo de execução (ms) com o label informado.
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()

            result = func(*args, **kwargs)

            duration = (time.perf_counter() - start) * 1000

            logger.info(
                "execution_time",
                extra={
                    "label": label,
                    "duration_ms": round(duration, 2),
                },
            )

            return result

        return wrapper

    return decorator


# =========================================================
# DATABASE QUERY UTILITIES
# =========================================================


def get_query_count() -> int:
    """
    Retorna a contagem de queries quando DEBUG=True; caso contrário, 0.
    """
    if not settings.DEBUG:
        return 0
    return len(connection.queries)


def count_queries(func):
    """
    Decorator que registra a contagem de queries executadas em DEBUG.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        if not settings.DEBUG:
            return func(*args, **kwargs)

        initial = len(connection.queries)
        result = func(*args, **kwargs)
        total = len(connection.queries) - initial

        logger.debug("db_queries", extra={"count": total})

        return result

    return wrapper


# =========================================================
# SLOW QUERY LOGGER
# =========================================================


def log_slow_queries(threshold_ms: int = 200):
    """
    Registra queries com tempo acima de threshold_ms em DEBUG.
    """
    if not settings.DEBUG:
        return

    for query in connection.queries:
        duration_ms = float(query.get("time", 0)) * 1000

        if duration_ms > threshold_ms:
            logger.warning(
                "slow_query",
                extra={
                    "duration_ms": duration_ms,
                    "sql": query.get("sql")[:500],
                },
            )


# =========================================================
# SLOW REQUEST LOGGER
# =========================================================


def log_slow_request(path: str, duration_s: float, threshold_s: float = 1.0):
    """
    Registra requisições com tempo acima de threshold_s.
    """
    if duration_s > threshold_s:
        logger.warning(
            "slow_request",
            extra={
                "path": path,
                "duration_ms": round(duration_s * 1000, 2),
            },
        )


# =========================================================
# MEMORY USAGE (OPTIONAL)
# =========================================================


def get_memory_usage():
    """
    Retorna uso de memória do processo (MB) se psutil estiver disponível.
    """
    try:
        import psutil

        process = psutil.Process()
        return round(process.memory_info().rss / 1024 / 1024, 2)
    except Exception:
        return None


# =========================================================
# REQUEST METRICS SUMMARY
# =========================================================


def request_metrics_summary(label: str, start_time: float):
    """
    Registra métricas de request (duração, memória, queries).
    """
    duration_ms = (time.perf_counter() - start_time) * 1000

    logger.info(
        "request_summary",
        extra={
            "label": label,
            "duration_ms": round(duration_ms, 2),
            "memory_mb": get_memory_usage(),
            "queries": get_query_count(),
        },
    )
