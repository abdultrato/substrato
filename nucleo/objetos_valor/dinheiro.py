from decimal import Decimal, ROUND_HALF_UP


class Dinheiro:
    def __init__(self, valor):
        self.valor = Decimal(valor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        if self.valor < 0:
            raise ValueError("Valor monetário não pode ser negativo.")

    def __add__(self, outro):
        return Dinheiro(self.valor + outro.valor)

    def __sub__(self, outro):
        return Dinheiro(self.valor - outro.valor)

    def __str__(self):
        return f"{self.valor:.2f}"
