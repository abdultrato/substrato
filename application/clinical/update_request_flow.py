from domain.clinical.request_rules import RequestFlow


class UpdateRequestFlow:
    @staticmethod
    def execute(request):

        novo_status = RequestFlow.determine_status(request)

        request.aplicar_status(novo_status)

        return request


AtualizarFluxoRequisicao = UpdateRequestFlow
UpdateRequestFlow.executar = UpdateRequestFlow.execute
