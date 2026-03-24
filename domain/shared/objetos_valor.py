class Dinheiro:
    def __init__(self, valor):
        if valor < 0:
            raise ValueError("Valor não pode ser negativo")
        self.valor = valor

    def __add__(self, outro):
        return Dinheiro(self.valor + outro.valor)
