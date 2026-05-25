from __future__ import annotations

from typing import Any


def resolver_por_ultima_escrita(valor_local: Any, valor_remoto: Any, remoto_mais_recente: bool) -> Any:
    return valor_remoto if remoto_mais_recente else valor_local
