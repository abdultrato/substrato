class ResultInterpreter:
    @staticmethod
    def interpret(result_item):
        """
        Recebe um ResultadoItem
        Retorna dict com interpretação clínica
        """

        # Aqui entra sua lógica completa
        # sem tocar banco diretamente

        return {
            "clinical_status": "normal",
            "report_color": "verde",
            "critical_alert": False,
            "delta_alerta": False,
            "tendencia": "",
            "interpretacao": "",
        }
