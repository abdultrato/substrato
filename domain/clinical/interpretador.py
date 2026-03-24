# LOCAL: dominio/clinico/interpretador.py

from dataclasses import dataclass


class StatusClinico:
    NORMAL = "normal"
    BAIXO = "baixo"
    ALTO = "alto"
    CRITICO = "critico"


@dataclass(frozen=True)
class IntervaloReferencia:
    minimo: float | None = None
    maximo: float | None = None
    critico_baixo: float | None = None
    critico_alto: float | None = None


def interpretar(valor: float | None, ref: IntervaloReferencia | None) -> str:
    """
    Interpreta um valor laboratorial com base no intervalo clínico.
    """

    # sem valor → normal
    if valor is None:
        return StatusClinico.NORMAL

    # sem referência clínica cadastrada
    if ref is None:
        return StatusClinico.NORMAL

    # limites críticos (prioridade máxima)
    if ref.critico_baixo is not None and valor <= ref.critico_baixo:
        return StatusClinico.CRITICO

    if ref.critico_alto is not None and valor >= ref.critico_alto:
        return StatusClinico.CRITICO

    # limites normais
    if ref.minimo is not None and valor < ref.minimo:
        return StatusClinico.BAIXO

    if ref.maximo is not None and valor > ref.maximo:
        return StatusClinico.ALTO

    return StatusClinico.NORMAL
