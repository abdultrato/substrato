from apps.accounting.services import ServicoContabil


class ServicoFinanceiro:
    def registrar_receita(self, pagamento):
        ServicoContabil().registrar_lancamento("Recebimento", pagamento.valor)
