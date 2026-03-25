def validate_result_value(value):
    if value == "":
        raise ValueError("Valor do result não pode ser vazio")


validar_value_result = validate_result_value
