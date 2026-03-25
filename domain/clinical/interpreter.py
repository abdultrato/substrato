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
    critical_low: float | None = None
    critical_high: float | None = None


def interpret(value: float | None, reference: ReferenceRange | None) -> str:
    """
    Interpreta um value laboratorial com base no intervalo clínico.
    """

    if value is None:
        return ClinicalStatus.NORMAL

    if reference is None:
        return ClinicalStatus.NORMAL

    if reference.critical_low is not None and value <= reference.critical_low:
        return ClinicalStatus.CRITICAL

    if reference.critical_high is not None and value >= reference.critical_high:
        return ClinicalStatus.CRITICAL

    if reference.minimo is not None and value < reference.minimo:
        return ClinicalStatus.LOW

    if reference.maximo is not None and value > reference.maximo:
        return ClinicalStatus.HIGH

    return ClinicalStatus.NORMAL

