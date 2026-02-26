from django.db import models


class EmailMinusculoField(models.EmailField):
    def to_python(self, value):
        value = super().to_python(value)
        if value:
            return value.lower()
        return value
