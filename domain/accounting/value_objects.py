from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal


@dataclass(frozen=True)
class MoneyValue:
    valor: Decimal

    def __post_init__(self):
        normalized_value = self._normalize(self.valor)
        if normalized_value < Decimal("0.00"):
            raise ValueError("Valor monetário não pode ser negativo.")

        object.__setattr__(self, "valor", normalized_value)

    @staticmethod
    def _normalize(valor: Decimal) -> Decimal:
        return Decimal(valor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def __add__(self, other: "MoneyValue") -> "MoneyValue":
        return MoneyValue(self.valor + other.valor)

    def __sub__(self, other: "MoneyValue") -> "MoneyValue":
        result = self.valor - other.valor
        if result < 0:
            raise ValueError("Resultado não pode ser negativo.")
        return MoneyValue(result)

    def __eq__(self, other):
        return self.valor == other.valor

    def __str__(self):
        return f"{self.valor:.2f}"


@dataclass(frozen=True)
class EntryNature:
    tipo: Literal["D", "C"]

    def __post_init__(self):
        if self.tipo not in ("D", "C"):
            raise ValueError("Natureza deve ser 'D' (Débito) ou 'C' (Crédito).")

    def inverted(self) -> "EntryNature":
        return EntryNature("C" if self.tipo == "D" else "D")

    def __str__(self):
        return "Débito" if self.tipo == "D" else "Crédito"


@dataclass(frozen=True)
class AccountingPeriod:
    data: date

    def year(self) -> int:
        return self.data.year

    def month(self) -> int:
        return self.data.month

    def key(self) -> str:
        return f"{self.data.year}-{self.data.month:02d}"

    def __str__(self):
        return self.key()


@dataclass(frozen=True)
class ExternalReference:
    valor: str

    def __post_init__(self):
        if not self.valor:
            raise ValueError("Referência externa não pode ser vazia.")

        if len(self.valor) > 120:
            raise ValueError("Referência externa excede limite permitido.")

    def __str__(self):
        return self.valor


ValorMonetario = MoneyValue
NaturezaLancamento = EntryNature
PeriodoContabil = AccountingPeriod
ReferenciaExterna = ExternalReference

MoneyValue._normalizar = staticmethod(MoneyValue._normalize)
EntryNature.invertida = EntryNature.inverted
AccountingPeriod.ano = AccountingPeriod.year
AccountingPeriod.mes = AccountingPeriod.month
AccountingPeriod.chave = AccountingPeriod.key
