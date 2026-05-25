from __future__ import annotations

from collections.abc import Iterable
from datetime import date
from typing import Protocol, TypeVar


class LoteComValidade(Protocol):
    lot_number: str
    expiration_date: date | None


Lote = TypeVar("Lote", bound=LoteComValidade)


def produto_perecivel(lotes: Iterable[LoteComValidade]) -> bool:
    return any(lote.expiration_date is not None for lote in lotes)


def priorizar_lotes_fefo(lotes: Iterable[Lote]) -> list[Lote]:
    return sorted(
        lotes,
        key=lambda lote: (
            lote.expiration_date is None,
            lote.expiration_date or date.max,
            getattr(lote, "lot_number", ""),
        ),
    )
