def validate_result_value(valor):
    if valor == "":
        raise ValueError("Valor do resultado não pode ser vazio")


validar_valor_resultado = validate_result_value
