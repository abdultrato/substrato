from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class StockNotification:
    title: str
    message: str
    severity: str = "info"
