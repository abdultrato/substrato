from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal


@dataclass(frozen=True)
class MoneyValue:
    value: Decimal

    def __post_init__(self):
        normalized_value = self._normalize(self.value)
        if normalized_value < Decimal("0.00"):
            raise ValueError("Valor monetário não pode ser negativo.")

        object.__setattr__(self, "value", normalized_value)

    @staticmethod
    def _normalize(value: Decimal) -> Decimal:
        return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def __add__(self, other: "MoneyValue") -> "MoneyValue":
        return MoneyValue(self.value + other.value)

    def __sub__(self, other: "MoneyValue") -> "MoneyValue":
        result = self.value - other.value
        if result < 0:
            raise ValueError("Resultado não pode ser negativo.")
        return MoneyValue(result)

    def __eq__(self, other):
        return self.value == other.value

    def __str__(self):
        return f"{self.value:.2f}"


@dataclass(frozen=True)
class EntryNature:
    type: Literal["D", "C"]

    def __post_init__(self):
        if self.type not in ("D", "C"):
            raise ValueError("Natureza deve ser 'D' (Débito) ou 'C' (Crédito).")

    def inverted(self) -> "EntryNature":
        return EntryNature("C" if self.type == "D" else "D")

    def __str__(self):
        return "Débito" if self.type == "D" else "Crédito"


@dataclass(frozen=True)
class AccountingPeriod:
    date: date

    def year(self) -> int:
        return self.date.year

    def month(self) -> int:
        return self.date.month

    def key(self) -> str:
        return f"{self.date.year}-{self.date.month:02d}"

    def __str__(self):
        return self.key()


@dataclass(frozen=True)
class ExternalReference:
    value: str

    def __post_init__(self):
        if not self.value:
            raise ValueError("Referência externa não pode ser vazia.")

        if len(self.value) > 120:
            raise ValueError("Referência externa excede limite permitido.")

    def __str__(self):
        return self.value


ValorMonetario = MoneyValue
NaturezaLancamento = EntryNature
PeriodoContabil = AccountingPeriod
ReferenciaExterna = ExternalReference

MoneyValue._normalizar = staticmethod(MoneyValue._normalize)
EntryNature.invertida = EntryNature.inverted
AccountingPeriod.year = AccountingPeriod.year
AccountingPeriod.month = AccountingPeriod.month
AccountingPeriod.key = AccountingPeriod.key
