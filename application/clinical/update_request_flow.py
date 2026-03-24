from domain.clinical.regras_requisicao import FluxoRequisicao


class UpdateRequestFlow:
    @staticmethod
    def execute(requisicao):

        novo_status = FluxoRequisicao.determinar_status(requisicao)

        requisicao.aplicar_status(novo_status)

        return requisicao


AtualizarFluxoRequisicao = UpdateRequestFlow
UpdateRequestFlow.executar = UpdateRequestFlow.execute
