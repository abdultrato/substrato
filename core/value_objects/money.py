from decimal import ROUND_HALF_UP, Decimal


class Money:
    def __init__(self, value):
        self.valor = Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        if self.valor < 0:
            raise ValueError("Valor monetário não pode ser negativo.")

    def __add__(self, other):
        return Money(self.valor + other.valor)

    def __sub__(self, other):
        return Money(self.valor - other.valor)

    def __str__(self):
        return f"{self.valor:.2f}"


Dinheiro = Money
