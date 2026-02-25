import re

from django.core.exceptions import ValidationError
from django.db import models


def normalizar_telefone(valor):
    return re.sub(r"\D", "", valor or "")


def validar_telefone_mz(valor):
    if not valor:
        return valor

    valor = normalizar_telefone(valor)

    if len(valor) != 9:
        raise ValidationError("Telefone deve conter 9 dígitos.")

    if not valor.startswith(("82", "83", "84", "85", "86", "87")):
        raise ValidationError("Número inválido para Moçambique.")

    return valor


class TelefoneField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 9)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)

    def clean(self, value, model_instance):
        value = super().clean(value, model_instance)
        return validar_telefone_mz(value)


class NuitField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 9)
        kwargs.setdefault("unique", True)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)


class LowerEmailField(models.EmailField):
    def clean(self, value, model_instance):
        value = super().clean(value, model_instance)
        return value.lower().strip() if value else value


class NomeField(models.CharField):
    def clean(self, value, model_instance):
        value = super().clean(value, model_instance)
        return value.strip().title() if value else value
