from django.db import models

from .choices import Currency


class MoneyField(models.DecimalField):
    def __init__(self, *args, currency_default=Currency.MZN, **kwargs):
        self.currency_default = currency_default
        kwargs.setdefault("max_digits", 12)
        kwargs.setdefault("decimal_places", 2)
        super().__init__(*args, **kwargs)

    def contribute_to_class(self, cls, name, **kwargs):
        super().contribute_to_class(cls, name)

        cls.add_to_class(
            f"{name}_currency",
            models.CharField(
                max_length=3,
                choices=Currency.choices,
                default=self.currency_default,
            ),
        )
