def validar_valor_resultado(valor):
    if valor == "":
        raise ValueError("Valor do resultado não pode ser vazio")
