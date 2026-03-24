def validar_fatura(total):
    if total < 0:
        raise ValueError("Total da fatura inválido")
