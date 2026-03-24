from django.utils.timezone import now
from prometheus_client import Histogram

START_TIME = now()

_metrics = {
    "requests": 0,
    "errors": 0,
    "total_time": 0,
}

INVOICE_RECALCULATION_DURATION = Histogram(
    "substrato_recalculo_fatura_duration_seconds",
    "Tempo de recalculo de totais por fatura",
    ["tenant_id"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)


def register_request(execution_time):
    _metrics["requests"] += 1
    _metrics["total_time"] += execution_time


def register_error():
    _metrics["errors"] += 1


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


FATURA_RECALCULO_DURATION = INVOICE_RECALCULATION_DURATION
registrar_requisicao = register_request
registrar_erro = register_error
obter_metricas = get_runtime_metrics
