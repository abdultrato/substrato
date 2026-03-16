from dominio.contabilidade.excecoes import LancamentoDesbalanceado


class LedgerAggregate:
    def __init__(
        self,
        linhas,
    ):
        self.linhas = linhas

    def validar(
        self,
    ):
        debitos = sum(linha.valor for linha in self.linhas if linha.natureza == "D")
        creditos = sum(linha.valor for linha in self.linhas if linha.natureza == "C")

        if debitos != creditos:
            raise LancamentoDesbalanceado()
