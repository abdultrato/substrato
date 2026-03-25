import re

from django.core.exceptions import ValidationError


def apenas_numeros(value: str | None):
    if not value:
        return value
    return re.sub(r"\D", "", value)


def validate_percentage(value):
    if value is None:
        return value

    if value < 0 or value > 100:
        raise ValidationError("Valor deve estar entre 0 e 100.")

    return value


def validate_minimum_text(value: str, minimo=3):
    if not value or len(value.strip()) < minimo:
        raise ValidationError(f"Deve conter pelo menos {minimo} caracteres.")
    return value


def validate_code(value: str):
    if not value:
        return value

    value = value.strip().upper()

    if not re.match(r"^[A-Z0-9\-]+$", value):
        raise ValidationError("Código inválido.")

    return value


validar_percentual = validate_percentage
validar_texto_minimo = validate_minimum_text
validar_code = validate_code
