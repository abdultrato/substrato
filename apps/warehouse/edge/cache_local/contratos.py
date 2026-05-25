from __future__ import annotations

from typing import Any, Protocol


class CacheLocalWarehouse(Protocol):
    def obter(self, chave: str) -> Any | None: ...

    def guardar(self, chave: str, valor: Any) -> None: ...
