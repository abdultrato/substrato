def validar_valor_resultado(valor: str) -> None:
    if valor is None or str(valor).strip() == "":
        raise ValueError("Valor do resultado não pode ser vazio")
