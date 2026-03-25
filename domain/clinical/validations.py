def validate_result_value(value: str) -> None:
    if value is None or str(value).strip() == "":
        raise ValueError("Valor do result não pode ser vazio")


validar_value_result = validate_result_value
