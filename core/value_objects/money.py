"""Value object de dinheiro com arredondamento HALF_UP."""

from decimal import ROUND_HALF_UP, Decimal


class Money:
    def __init__(self, value):
        self.value = Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        if self.value < 0:
            raise ValueError("Valor monetário não pode ser negativo.")

    def __add__(self, other):
        return Money(self.value + other.value)

    def __sub__(self, other):
        return Money(self.value - other.value)

    def __str__(self):
        return f"{self.value:.2f}"


Dinheiro = Money
