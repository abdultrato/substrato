"""Funções de validação simples para resultados clínicos."""


def validate_result_value(value):
    """Impede valores vazios em resultados."""
    if value == "":
        raise ValueError("Valor do result não pode ser vazio")


# Alias legado
validar_value_result = validate_result_value
