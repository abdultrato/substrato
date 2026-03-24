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

        if reference.critico_baixo is not None and value < reference.critico_baixo:
            status = "CRITICO_BAIXO"
            report_color = "vermelho"
            critical_alert = True

        elif reference.critico_alto is not None and value > reference.critico_alto:
            status = "CRITICO_ALTO"
            report_color = "vermelho"
            critical_alert = True

        elif reference.valor_minimo is not None and value < reference.valor_minimo:
            status = "BAIXO"
            report_color = "azul"

        elif reference.valor_maximo is not None and value > reference.valor_maximo:
            status = "ALTO"
            report_color = "laranja"

        return {
            "status_clinico": status,
            "cor_laudo": report_color,
            "alerta_critico": critical_alert,
        }


def validate_age(date_of_birth: date | None) -> None:
    if date_of_birth is None:
        return

    if date_of_birth > timezone.localdate():
        raise ValueError("Data de nascimento não pode estar no futuro.")


InterpretadorResultado = ResultInterpreter
validar_idade = validate_age
ResultInterpreter.interpretar = staticmethod(ResultInterpreter.interpret)
