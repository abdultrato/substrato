from django.db import models
import re
from django.core.exceptions import ValidationError


class NuitField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 9)
        kwargs.setdefault("unique", True)
        super().__init__(*args, **kwargs)

    def clean(self, value, model_instance):
        value = re.sub(r"\D", "", value or "")

        if value and len(value) != 9:
            raise ValidationError("NUIT deve conter 9 dígitos.")

        return super().clean(value, model_instance)
