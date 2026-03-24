from domain.clinical.request_rules import RequestFlow


class UpdateRequestFlow:
    @staticmethod
    def execute(requisicao):

        novo_status = RequestFlow.determine_status(requisicao)

        requisicao.aplicar_status(novo_status)

        return requisicao


AtualizarFluxoRequisicao = UpdateRequestFlow
UpdateRequestFlow.executar = UpdateRequestFlow.execute
