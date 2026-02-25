from decimal import Decimal as d

from rest_framework import serializers as s


class MoneyField(s.DecimalField):
    """
    Campo monetário padronizado.
    """

    def to_representation(self, value):
        if value is None:
            return "0.00"
        return f"{d(value):.2f}"
