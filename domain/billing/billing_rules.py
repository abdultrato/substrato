def validate_invoice(total):
    if total < 0:
        raise ValueError("Total da fatura inválido")


validar_fatura = validate_invoice
