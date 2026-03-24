class FluxoRequisicao:
    @staticmethod
    def atualizar(requisicao):

        resultados = requisicao.resultados.all()

        if not resultados.exists():
            return requisicao.Status.CRIADA

        if resultados.filter(valor__isnull=False).exists():
            return requisicao.Status.EM_PROCESSAMENTO

        if resultados.filter(valor__isnull=True).count() == 0:
            return requisicao.Status.AGUARDANDO_VALIDACAO

        return requisicao.status
