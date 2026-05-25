from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

ZERO = Decimal("0")


@dataclass(frozen=True, slots=True)
class PoliticaReposicao:
    minimo: Decimal
    quantidade_requisicao: Decimal

    def __post_init__(self) -> None:
        minimo = Decimal(str(self.minimo))
        quantidade = Decimal(str(self.quantidade_requisicao))
        if minimo < ZERO:
            raise ValueError("Minimo de reposicao nao pode ser negativo.")
        if quantidade < ZERO:
            raise ValueError("Quantidade de requisicao nao pode ser negativa.")
        object.__setattr__(self, "minimo", minimo)
        object.__setattr__(self, "quantidade_requisicao", quantidade)

    def calcular_quantidade_requisicao(self, quantidade_atual: Decimal) -> Decimal:
        atual = Decimal(str(quantidade_atual))
        falta = self.minimo - atual
        if falta <= ZERO:
            return ZERO
        if self.quantidade_requisicao <= ZERO:
            return falta
        return max(self.quantidade_requisicao, falta)
