from __future__ import annotations

from dataclasses import dataclass

VALID_SEVERITIES = {"info", "warning", "critical"}


@dataclass(frozen=True, slots=True)
class StockNotification:
    title: str
    message: str
    severity: str = "info"

    def __post_init__(self) -> None:
        title = str(self.title or "").strip()
        message = str(self.message or "").strip()
        severity = str(self.severity or "info").lower()
        if not title:
            raise ValueError("title is required for warehouse stock notifications.")
        if not message:
            raise ValueError("message is required for warehouse stock notifications.")
        if severity not in VALID_SEVERITIES:
            raise ValueError(f"severity must be one of: {', '.join(sorted(VALID_SEVERITIES))}.")
        object.__setattr__(self, "title", title)
        object.__setattr__(self, "message", message)
        object.__setattr__(self, "severity", severity)
