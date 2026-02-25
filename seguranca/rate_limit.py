import time

_registros = {}

def permitido(chave, limite=5, intervalo=60):
    agora = time.time()
    tentativas = _registros.get(chave, [])

    tentativas = [t for t in tentativas if agora - t < intervalo]

    if len(tentativas) >= limite:
        return False

    tentativas.append(agora)
    _registros[chave] = tentativas
    return True
