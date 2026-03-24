import re

from django.core.exceptions import ValidationError


def apenas_numeros(valor: str | None):
    if not valor:
        return valor
    return re.sub(r"\D", "", valor)


def validar_percentual(valor):
    if valor is None:
        return valor

    if valor < 0 or valor > 100:
        raise ValidationError("Valor deve estar entre 0 e 100.")

    return valor


def validar_texto_minimo(valor: str, minimo=3):
    if not valor or len(valor.strip()) < minimo:
        raise ValidationError(f"Deve conter pelo menos {minimo} caracteres.")
    return valor


def validar_codigo(valor: str):
    if not valor:
        return valor

    valor = valor.strip().upper()

    if not re.match(r"^[A-Z0-9\-]+$", valor):
        raise ValidationError("Código inválido.")

    return valor
