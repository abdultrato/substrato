class Money:
    def __init__(self, value):
        if value < 0:
            raise ValueError("Valor não pode ser negativo")
        self.value = value

    def __add__(self, other):
        return Money(self.value + other.value)


Dinheiro = Money
