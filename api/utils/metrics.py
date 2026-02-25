import logging
import time
from functools import wraps

from django.conf import settings
from django.db import connection

logger = logging.getLogger("metrics")

# =========================================================
# TIMER CONTEXT MANAGER
# =========================================================


class Timer:
    """
    Mede tempo de execução de blocos de código.

    Uso:
        with Timer() as t:
            ...
        print(t.duration)
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
    Mede tempo de execução de funções.

    Uso:
        @measure_time("invoice_list")
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
    Retorna quantidade de queries executadas.
    Funciona apenas quando DEBUG=True.
    """
    if not settings.DEBUG:
        return 0
    return len(connection.queries)


def count_queries(func):
    """
    Conta queries executadas durante uma função.
    Usar apenas em DEBUG.
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
    Loga queries lentas.
    Recomendado para auditoria e DEBUG.
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
    Loga requisições lentas.
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
    Retorna uso de memória do processo (MB).
    Requer psutil instalado.
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
    Registra resumo de métricas após request.
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
