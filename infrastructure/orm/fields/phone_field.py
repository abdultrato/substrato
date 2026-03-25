import re

from django.core.exceptions import ValidationError
from django.db import models


class PhoneField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 9)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)

    def clean(self, value, model_instance):
        value = super().clean(value, model_instance)

        if not value:
            return value

        value = re.sub(r"\D", "", value)

        if len(value) != 9:
            raise ValidationError("Telefone deve conter 9 dígitos.")

        if not value.startswith(("82", "83", "84", "85", "86", "87")):
            raise ValidationError("Número inválido para Moçambique.")

        return value

TelefoneField = PhoneField


