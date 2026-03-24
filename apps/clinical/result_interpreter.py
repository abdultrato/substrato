class ResultInterpreter:
    @staticmethod
    def interpretar(resultado_item):
        """
        Recebe um ResultadoItem
        Retorna dict com interpretação clínica
        """

        # Aqui entra sua lógica completa
        # sem tocar banco diretamente

        return {
            "status_clinico": "normal",
            "cor_laudo": "verde",
            "alerta_critico": False,
            "delta_alerta": False,
            "tendencia": "",
            "interpretacao": "",
        }


InterpretadorResultado = ResultInterpreter
