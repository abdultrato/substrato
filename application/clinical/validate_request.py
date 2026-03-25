class ValidateRequest:
    @staticmethod
    def execute(request, user):

        if request.status != request.Status.AGUARDANDO_VALIDACAO:
            raise ValueError("Requisição não está pronta para validação.")

        if request.has_critical_result:
            raise ValueError("Existem resultados críticos.")

        request.status = request.Status.VALIDADA
        request.analyst = user
        request.save(update_fields=["status", "analyst"])

        return request


ValidarRequisicao = ValidateRequest
ValidateRequest.executar = ValidateRequest.execute
