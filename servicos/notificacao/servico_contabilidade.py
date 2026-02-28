from aplicativos.contabilidade.servicos import ServicoContabil

class ServicoFinanceiro:

    def registrar_receita(self, pagamento):
        ServicoContabil().registrar_lancamento(
            "Recebimento",
            pagamento.valor
        )
