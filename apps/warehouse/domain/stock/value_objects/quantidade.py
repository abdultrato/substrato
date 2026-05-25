from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

ZERO = Decimal("0")


@dataclass(frozen=True, slots=True)
class QuantidadeEstoque:
    valor: Decimal
    unidade: str = "UN"

    def __post_init__(self) -> None:
        valor = Decimal(str(self.valor))
        if valor < ZERO:
            raise ValueError("Quantidade de estoque nao pode ser negativa.")
        object.__setattr__(self, "valor", valor)
        object.__setattr__(self, "unidade", (self.unidade or "UN").upper())

    def abaixo_de(self, minimo: Decimal) -> bool:
        return self.valor < Decimal(str(minimo))
