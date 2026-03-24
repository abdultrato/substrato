import logging

from prometheus_client import Histogram

_metricas = {
    "requisicoes": 0,
    "erros": 0,
    "tempo_total": 0,
}

FATURA_RECALCULO_DURATION = Histogram(
    "substrato_recalculo_fatura_duration_seconds",
    "Tempo de recalculo de totais por fatura",
    ["tenant_id"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)


def registrar_requisicao(tempo_execucao):
    _metricas["requisicoes"] += 1
    _metricas["tempo_total"] += tempo_execucao


def registrar_erro():
    _metricas["erros"] += 1


def obter_metricas():
    media = 0
    if _metricas["requisicoes"]:
        media = _metricas["tempo_total"] / _metricas["requisicoes"]

    return {
        "total_requisicoes": _metricas["requisicoes"],
        "erros": _metricas["erros"],
        "tempo_medio": media,
    }


logger = logging.getLogger("metrics")


def log_slow_request(
    path: str,
    duration: float,
    threshold: float = 0.5,
    tenant_id=None,
):
    """
    Registra requisições lentas.

    :param path: caminho da requisição
    :param duration: tempo em segundos
    :param threshold: limite mínimo para logar
    """

    if duration >= threshold:
        logger.warning(
            "SLOW_REQUEST",
            extra={
                "path": path,
                "duracao_segundos": round(duration, 4),
                "tenant_id": tenant_id,
            },
        )
