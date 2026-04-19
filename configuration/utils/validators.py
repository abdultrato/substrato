"""Validações utilitárias usadas em serializers e views."""

from rest_framework.exceptions import ValidationError


def validate_positive(value, field="valor"):
    if value is None:
        return value

    if value < 0:
        raise ValidationError({field: "Deve ser positivo."})

    return value


def validate_percentage(value, field="percentagem"):
    if value is None:
        return value

    if value < 0 or value > 100:
        raise ValidationError({field: "Deve estar entre 0 e 100."})

    return value


def validate_not_empty(value, field="campo"):
    if value in (None, "", " "):
        raise ValidationError({field: "Não pode estar vazio."})

    return value
