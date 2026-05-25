from __future__ import annotations

from collections.abc import Iterable
from datetime import date
from typing import Protocol, TypeVar


class LotWithExpiration(Protocol):
    lot_number: str
    expiration_date: date | None


Lot = TypeVar("Lot", bound=LotWithExpiration)


def has_perishable_lots(lots: Iterable[LotWithExpiration]) -> bool:
    return any(lot.expiration_date is not None for lot in lots)


def prioritize_fefo_lots(lots: Iterable[Lot]) -> list[Lot]:
    return sorted(
        lots,
        key=lambda lot: (
            lot.expiration_date is None,
            lot.expiration_date or date.max,
            getattr(lot, "lot_number", ""),
        ),
    )
