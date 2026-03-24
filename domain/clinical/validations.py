def validate_result_value(value: str) -> None:
    if value is None or str(value).strip() == "":
        raise ValueError("Valor do resultado não pode ser vazio")


validar_valor_resultado = validate_result_value
