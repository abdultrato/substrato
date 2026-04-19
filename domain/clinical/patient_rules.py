"""Regras de negócio para pacientes (idade, IMC, gravidez)."""

from datetime import date
from decimal import Decimal

from django.utils import timezone


class ResultInterpreter:
    """
    Motor clínico de interpretação.
    """

    @staticmethod
    def interpret(value_str, reference):
        if not reference or not value_str:
            return {}

        try:
            value = Decimal(value_str)
        except Exception:
            return {}

        status = "NORMAL"
        report_color = "preto"
        critical_alert = False

        if reference.critical_low is not None and value < reference.critical_low:
            status = "CRITICO_BAIXO"
            report_color = "vermelho"
            critical_alert = True

        elif reference.critical_high is not None and value > reference.critical_high:
            status = "CRITICO_ALTO"
            report_color = "vermelho"
            critical_alert = True

        elif reference.minimum_value is not None and value < reference.minimum_value:
            status = "BAIXO"
            report_color = "azul"

        elif reference.maximum_value is not None and value > reference.maximum_value:
            status = "ALTO"
            report_color = "laranja"

        return {
            "clinical_status": status,
            "report_color": report_color,
            "critical_alert": critical_alert,
        }


def validate_age(date_of_birth: date | None) -> None:
    if date_of_birth is None:
        return

    if date_of_birth > timezone.localdate():
        raise ValueError("Data de nascimento não pode estar no futuro.")
