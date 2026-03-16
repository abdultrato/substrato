# LOCAL: dominio/clinico/state_machine_requisicao.py

from dominio.clinico.estado_requisicao import EstadoRequisicao


class TransicaoRequisicaoInvalida(Exception):
    pass


class RequisicaoStateMachine:
    TRANSICOES = {
        EstadoRequisicao.CRIADA: {
            EstadoRequisicao.EM_PROCESSAMENTO,
            EstadoRequisicao.CANCELADA,
        },
        EstadoRequisicao.EM_PROCESSAMENTO: {
            EstadoRequisicao.AGUARDANDO_VALIDACAO,
        },
        EstadoRequisicao.AGUARDANDO_VALIDACAO: {
            EstadoRequisicao.VALIDADA,
            EstadoRequisicao.CANCELADA,
        },
    }

    @classmethod
    def validar(cls, atual, novo):
        if atual in EstadoRequisicao.TERMINAIS:
            raise TransicaoRequisicaoInvalida("Requisição em estado final é imutável.")

        permitidos = cls.TRANSICOES.get(atual, set())

        if novo not in permitidos:
            raise TransicaoRequisicaoInvalida(f"Transição inválida de {atual} para {novo}.")
