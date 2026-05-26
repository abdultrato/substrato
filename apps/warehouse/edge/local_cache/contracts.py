from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


class LocalWarehouseCache(Protocol):
    def get(self, key: str) -> Any | None: ...

    def set(self, key: str, value: Any) -> None: ...

    def delete(self, key: str) -> None: ...


@dataclass(slots=True)
class InMemoryLocalWarehouseCache:
    values: dict[str, Any] = field(default_factory=dict)

    def get(self, key: str) -> Any | None:
        return self.values.get(str(key))

    def set(self, key: str, value: Any) -> None:
        self.values[str(key)] = value

    def delete(self, key: str) -> None:
        self.values.pop(str(key), None)
