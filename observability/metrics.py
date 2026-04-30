"""Coleta e envio de métricas técnicas e de negócio."""

from __future__ import annotations

from django.utils.timezone import now

try:
    from prometheus_client import Counter, Histogram
except ImportError:

    class _NoopMetric:  # type: ignore[override]
        def __init__(self, *args, **kwargs):
            pass

        def labels(self, *args, **kwargs):
            return self

        def observe(self, *args, **kwargs):
            return None

        def inc(self, *args, **kwargs):
            return None

    Counter = _NoopMetric  # type: ignore[assignment]
    Histogram = _NoopMetric  # type: ignore[assignment]

START_TIME = now()

_metrics = {
    "requests": 0,
    "errors": 0,
    "total_time": 0,
}

INVOICE_RECALCULATION_DURATION = Histogram(
    "substrato_recalculo_invoice_duration_seconds",
    "Tempo de recalculo de totais por invoice",
    ["tenant_id"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)

API_REQUESTS_TOTAL = Counter(
    "substrato_api_requests_total",
    "Total de requests HTTP atendidos pela API.",
    ["method", "status_group"],
)

API_REQUEST_DURATION_SECONDS = Histogram(
    "substrato_api_request_duration_seconds",
    "Tempo de resposta da API (segundos).",
    ["method", "status_group"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20),
)

API_SLOW_REQUESTS_TOTAL = Counter(
    "substrato_api_slow_requests_total",
    "Total de requests classificados como lentos.",
    ["method"],
)

ASYNC_TASK_ENQUEUE_TOTAL = Counter(
    "substrato_async_task_enqueue_total",
    "Total de tarefas assíncronas enfileiradas.",
    ["task_name", "status", "tenant_id"],
)

ASYNC_TASK_EXECUTION_DURATION_SECONDS = Histogram(
    "substrato_async_task_execution_duration_seconds",
    "Tempo de execução de tarefas assíncronas.",
    ["task_name", "status", "tenant_id"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30, 60),
)


def _status_group(status_code: int | None) -> str:
    try:
        code = int(status_code or 0)
    except Exception:
        return "unknown"
    if code < 100:
        return "unknown"
    return f"{code // 100}xx"


def register_request(execution_time):
    _metrics["requests"] += 1
    _metrics["total_time"] += execution_time


def register_error():
    _metrics["errors"] += 1


def register_api_request(method: str, status_code: int | None, duration_ms: float) -> None:
    method_label = (method or "UNKNOWN").upper()
    status_label = _status_group(status_code)
    duration_seconds = max(0.0, float(duration_ms or 0) / 1000.0)

    API_REQUESTS_TOTAL.labels(method_label, status_label).inc()
    API_REQUEST_DURATION_SECONDS.labels(method_label, status_label).observe(duration_seconds)


def register_slow_request(method: str) -> None:
    API_SLOW_REQUESTS_TOTAL.labels((method or "UNKNOWN").upper()).inc()


def register_async_task_enqueue(task_name: str, status: str, tenant_id=None) -> None:
    ASYNC_TASK_ENQUEUE_TOTAL.labels(
        (task_name or "unknown").lower(),
        (status or "unknown").lower(),
        str(tenant_id or "unknown"),
    ).inc()


def observe_async_task_duration(task_name: str, duration_seconds: float, status: str = "success", tenant_id=None) -> None:
    ASYNC_TASK_EXECUTION_DURATION_SECONDS.labels(
        (task_name or "unknown").lower(),
        (status or "unknown").lower(),
        str(tenant_id or "unknown"),
    ).observe(max(0.0, float(duration_seconds or 0.0)))


def get_runtime_metrics():
    average = 0
    if _metrics["requests"]:
        average = _metrics["total_time"] / _metrics["requests"]

    return {
        "total_requisicoes": _metrics["requests"],
        "erros": _metrics["errors"],
        "tempo_medio": average,
    }


def get_metrics():
    uptime = now() - START_TIME

    return {
        "uptime_seconds": int(uptime.total_seconds()),
        **get_runtime_metrics(),
    }


def log_slow_request(
    path: str,
    duration: float,
    threshold: float = 0.5,
    tenant_id=None,
):
    """
    Registra requisições lentas.
    """

    import logging

    logger = logging.getLogger("metrics")
    if duration >= threshold:
        logger.warning(
            "SLOW_REQUEST",
            extra={
                "path": path,
                "duracao_segundos": round(duration, 4),
                "tenant_id": tenant_id,
            },
        )


__all__ = [
    "API_REQUESTS_TOTAL",
    "API_REQUEST_DURATION_SECONDS",
    "API_SLOW_REQUESTS_TOTAL",
    "ASYNC_TASK_ENQUEUE_TOTAL",
    "ASYNC_TASK_EXECUTION_DURATION_SECONDS",
    "INVOICE_RECALCULATION_DURATION",
    "START_TIME",
    "get_metrics",
    "get_runtime_metrics",
    "log_slow_request",
    "observe_async_task_duration",
    "register_api_request",
    "register_async_task_enqueue",
    "register_error",
    "register_request",
    "register_slow_request",
]
