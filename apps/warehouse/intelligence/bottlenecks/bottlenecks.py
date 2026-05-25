from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class BottleneckSignal:
    process_name: str
    delay_minutes: int
    severity: str
