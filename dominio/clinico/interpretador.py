from dataclasses import dataclass


class Status:
    NORMAL = "normal"
    BAIXO = "baixo"
    ALTO = "alto"
    CRITICO = "critico"


@dataclass
class IntervaloReferencia:
    minimo: float | None = None
    maximo: float | None = None
    critico_baixo: float | None = None
    critico_alto: float | None = None


def interpretar(valor: float, ref: IntervaloReferencia) -> str:

    if valor is None:
        return Status.NORMAL

    if ref.critico_baixo and valor < ref.critico_baixo:
        return Status.CRITICO

    if ref.critico_alto and valor > ref.critico_alto:
        return Status.CRITICO

    if ref.minimo and valor < ref.minimo:
        return Status.BAIXO

    if ref.maximo and valor > ref.maximo:
        return Status.ALTO

    return Status.NORMAL
