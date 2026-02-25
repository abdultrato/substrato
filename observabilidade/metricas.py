import time

_metricas = {
    "requisicoes": 0,
    "erros": 0,
    "tempo_total": 0,
}

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
