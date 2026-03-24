class Address:
    def __init__(self, street: str, city: str, country: str = "Moçambique"):
        if not street or not city:
            raise ValueError("Endereço incompleto.")

        self.rua = street.strip()
        self.cidade = city.strip()
        self.pais = country.strip()

    def __str__(self):
        return f"{self.rua}, {self.cidade} - {self.pais}"


Endereco = Address
