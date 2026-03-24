from decimal import Decimal


class InterpretadorResultado:
    """
    Motor clínico de interpretação.
    """

    @staticmethod
    def interpretar(valor_str, referencia):
        if not referencia or not valor_str:
            return {}

        try:
            valor = Decimal(valor_str)
        except Exception:
            return {}

        status = "NORMAL"
        cor = "preto"
        alerta = False

        if referencia.critico_baixo is not None and valor < referencia.critico_baixo:
            status = "CRITICO_BAIXO"
            cor = "vermelho"
            alerta = True

        elif referencia.critico_alto is not None and valor > referencia.critico_alto:
            status = "CRITICO_ALTO"
            cor = "vermelho"
            alerta = True

        elif referencia.valor_minimo is not None and valor < referencia.valor_minimo:
            status = "BAIXO"
            cor = "azul"

        elif referencia.valor_maximo is not None and valor > referencia.valor_maximo:
            status = "ALTO"
            cor = "laranja"

        return {
            "status_clinico": status,
            "cor_laudo": cor,
            "alerta_critico": alerta,
        }
