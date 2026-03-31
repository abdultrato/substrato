"""Stub de interpretação clínica de resultados (extensível)."""


class ResultInterpreter:
    @staticmethod
    def interpret(result_item):
        """
        Recebe um ResultadoItem e retorna dict com interpretação clínica.
        Substitua por lógica real sem tocar banco diretamente.
        """

        # Placeholder: implementar regra de negócio real
        return {
            "clinical_status": "normal",
            "report_color": "verde",
            "critical_alert": False,
            "delta_alerta": False,
            "tendencia": "",
            "interpretacao": "",
        }
