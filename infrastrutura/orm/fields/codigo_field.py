import re

from django.core.exceptions import ValidationError
from django.db import models


class CodigoField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 20)
        kwargs.setdefault("unique", True)
        super().__init__(*args, **kwargs)

    def clean(self, value, model_instance):
        value = value.strip().upper()

        if not re.match(r"^[A-Z0-9\-]+$", value):
            raise ValidationError("Código inválido.")

        return super().clean(value, model_instance)
