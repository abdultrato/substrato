"""Regras para checar se o pagamento quita a fatura."""

def is_payment_settled(paid_value, invoice_total):
    return paid_value >= invoice_total


payment_quitado = is_payment_settled
