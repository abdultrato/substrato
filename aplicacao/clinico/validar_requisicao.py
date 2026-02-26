class ValidarRequisicao:

    @staticmethod
    def executar(requisicao, usuario):

        if requisicao.status != requisicao.Status.AGUARDANDO_VALIDACAO:
            raise ValueError("Requisição não está pronta para validação.")

        if requisicao.possui_resultado_critico:
            raise ValueError("Existem resultados críticos.")

        requisicao.status = requisicao.Status.VALIDADA
        requisicao.analista = usuario
        requisicao.save(update_fields=["status", "analista"])

        return requisicao
