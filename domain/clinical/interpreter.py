from dataclasses import dataclass


class ClinicalStatus:
    NORMAL = "normal"
    LOW = "baixo"
    HIGH = "alto"
    CRITICAL = "critico"


@dataclass(frozen=True)
class ReferenceRange:
    minimo: float | None = None
    maximo: float | None = None
    critico_baixo: float | None = None
    critico_alto: float | None = None


def interpret(value: float | None, reference: ReferenceRange | None) -> str:
    """
    Interpreta um valor laboratorial com base no intervalo clínico.
    """

    if value is None:
        return ClinicalStatus.NORMAL

    if reference is None:
        return ClinicalStatus.NORMAL

    if reference.critico_baixo is not None and value <= reference.critico_baixo:
        return ClinicalStatus.CRITICAL

    if reference.critico_alto is not None and value >= reference.critico_alto:
        return ClinicalStatus.CRITICAL

    if reference.minimo is not None and value < reference.minimo:
        return ClinicalStatus.LOW

    if reference.maximo is not None and value > reference.maximo:
        return ClinicalStatus.HIGH

    return ClinicalStatus.NORMAL


StatusClinico = ClinicalStatus
IntervaloReferencia = ReferenceRange
interpretar = interpret
