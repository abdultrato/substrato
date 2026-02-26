from dominio.clinico.regras_requisicao import FluxoRequisicao


class AtualizarFluxoRequisicao:

    @staticmethod
    def executar(requisicao):

        novo_status = FluxoRequisicao.determinar_status(requisicao)

        requisicao.aplicar_status(novo_status)

        return requisicao
