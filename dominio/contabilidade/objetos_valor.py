from dataclasses import dataclass
from datetime import date
from decimal import (
    ROUND_HALF_UP,
    Decimal,
)
from typing import Literal

# =========================================================
# VALOR MONETÁRIO
# =========================================================


@dataclass(
    frozen=True,
)
class ValorMonetario:
    valor: Decimal

    def __post_init__(
        self,
    ):
        valor_normalizado = self._normalizar(
            self.valor,
        )

        if valor_normalizado < Decimal(
            "0.00",
        ):
            raise ValueError(
                "Valor monetário não pode ser negativo.",
            )

        object.__setattr__(
            self,
            "valor",
            valor_normalizado,
        )

    @staticmethod
    def _normalizar(
        valor: Decimal,
    ) -> Decimal:
        return Decimal(
            valor,
        ).quantize(
            Decimal(
                "0.01",
            ),
            rounding=ROUND_HALF_UP,
        )

    def __add__(
        self,
        other: "ValorMonetario",
    ) -> "ValorMonetario":
        return ValorMonetario(
            self.valor + other.valor,
        )

    def __sub__(
        self,
        other: "ValorMonetario",
    ) -> "ValorMonetario":
        resultado = self.valor - other.valor
        if resultado < 0:
            raise ValueError(
                "Resultado não pode ser negativo.",
            )
        return ValorMonetario(
            resultado,
        )

    def __eq__(
        self,
        other,
    ):
        return self.valor == other.valor

    def __str__(
        self,
    ):
        return f"{self.valor:.2f}"


# =========================================================
# NATUREZA DO LANÇAMENTO
# =========================================================


@dataclass(
    frozen=True,
)
class NaturezaLancamento:
    tipo: Literal["D", "C"]

    def __post_init__(
        self,
    ):
        if self.tipo not in (
            "D",
            "C",
        ):
            raise ValueError(
                "Natureza deve ser 'D' (Débito) ou 'C' (Crédito).",
            )

    def invertida(
        self,
    ) -> "NaturezaLancamento":
        return NaturezaLancamento(
            "C" if self.tipo == "D" else "D",
        )

    def __str__(
        self,
    ):
        return "Débito" if self.tipo == "D" else "Crédito"


# =========================================================
# PERÍODO CONTÁBIL
# =========================================================


@dataclass(
    frozen=True,
)
class PeriodoContabil:
    data: date

    def ano(
        self,
    ) -> int:
        return self.data.year

    def mes(
        self,
    ) -> int:
        return self.data.month

    def chave(
        self,
    ) -> str:
        return f"{self.data.year}-{self.data.month:02d}"

    def __str__(
        self,
    ):
        return self.chave()


# =========================================================
# REFERÊNCIA EXTERNA
# =========================================================


@dataclass(
    frozen=True,
)
class ReferenciaExterna:
    valor: str

    def __post_init__(
        self,
    ):
        if not self.valor:
            raise ValueError(
                "Referência externa não pode ser vazia.",
            )

        if (
            len(
                self.valor,
            )
            > 120
        ):
            raise ValueError(
                "Referência externa excede limite permitido.",
            )

    def __str__(
        self,
    ):
        return self.valor
