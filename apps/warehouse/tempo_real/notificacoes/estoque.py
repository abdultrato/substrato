from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class NotificacaoEstoque:
    titulo: str
    mensagem: str
    severidade: str = "info"
