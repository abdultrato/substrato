class Endereco:
    def __init__(self, rua: str, cidade: str, pais: str = "Moçambique"):
        if not rua or not cidade:
            raise ValueError("Endereço incompleto.")

        self.rua = rua.strip()
        self.cidade = cidade.strip()
        self.pais = pais.strip()

    def __str__(self):
        return f"{self.rua}, {self.cidade} - {self.pais}"
