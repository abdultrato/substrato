def validar_movimentos(movimentos):
    total_debito = sum(m["debito"] for m in movimentos)
    total_credito = sum(m["credito"] for m in movimentos)

    if total_debito != total_credito:
        raise ValueError("Lançamento não balanceado")
