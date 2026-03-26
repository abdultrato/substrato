class PagamentoGateway:
    """
    Compatibility shim for the old payment gateway contract.
    """

    def cobrar(self, valor, referencia, telefone=None, **kwargs):
        raise NotImplementedError

    def consultar_estado(self, transacao_id):
        raise NotImplementedError

    def estornar(self, transacao_id, valor=None):
        raise NotImplementedError

    def charge(self, amount, reference, phone=None):
        return self.cobrar(amount, reference, telefone=phone)

    def status(self, transaction_id):
        return self.consultar_estado(transaction_id)

    def refund(self, transaction_id, amount=None):
        return self.estornar(transaction_id, valor=amount)
