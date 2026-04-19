"""Exceções do domínio de pagamentos."""

class PaymentFailed(Exception):
    """Falha ao processar pagamento."""


PagamentoFalhou = PaymentFailed
