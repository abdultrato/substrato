class ServicoAutorizacao:
    @staticmethod
    def necessita_autorizacao(plano):
        return plano.exige_autorizacao
