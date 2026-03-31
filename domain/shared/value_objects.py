"""Objetos de valor compartilhados entre domínios."""


class Money:
    """Representa um valor monetário simples com validação básica."""

    def __init__(self, value):
        """Cria uma instância garantindo que o valor não seja negativo."""
        if value < 0:
            raise ValueError("Valor não pode ser negativo")
        self.value = value

    def __add__(self, other):
        """Soma dois valores monetários retornando uma nova instância."""
        return Money(self.value + other.value)


Dinheiro = Money
