def validate_invoice(total):
    if total < 0:
        raise ValueError("Total da invoice inválido")


validar_invoice = validate_invoice
