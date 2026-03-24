def is_payment_settled(paid_value, invoice_total):
    return paid_value >= invoice_total


pagamento_quitado = is_payment_settled
