from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ItemEstoque:
    sku: str
    nome: str
    unidade: str = "UN"
    perecivel: bool = False

    def __post_init__(self) -> None:
        sku = (self.sku or "").strip()
        if not sku:
            raise ValueError("SKU e obrigatorio para item de estoque.")
        object.__setattr__(self, "sku", sku)
        object.__setattr__(self, "unidade", (self.unidade or "UN").upper())
