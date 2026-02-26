from django.db import models
from decimal import Decimal


class DinheiroField(models.DecimalField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_digits", 12)
        kwargs.setdefault("decimal_places", 2)
        super().__init__(*args, **kwargs)

    def to_python(self, value):
        if value is None:
            return value
        return Decimal(value)
