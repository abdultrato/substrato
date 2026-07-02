from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

ToolMode = Literal["read", "prepare_action", "write_confirmed"]


def format_money(value: Any, *, currency: str = "MZN") -> str:
    """Formata um valor monetário à portuguesa: milhares com espaço fino, duas
    casas decimais com vírgula e a moeda no fim. Ex.: 1461.6 -> "1 461,60 MZN".
    """

    try:
        amount = Decimal(str(value or 0)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return str(value)
    negative = amount < 0
    integer, _, frac = f"{abs(amount):.2f}".partition(".")
    # Agrupa os milhares com espaço.
    grouped = ""
    for idx, digit in enumerate(reversed(integer)):
        if idx and idx % 3 == 0:
            grouped = " " + grouped
        grouped = digit + grouped
    formatted = f"{grouped},{frac}"
    if negative:
        formatted = f"-{formatted}"
    return f"{formatted} {currency}".strip() if currency else formatted


@dataclass(slots=True)
class AiToolContext:
    tenant: Any
    user: Any
    arguments: dict[str, Any]
    language: str = "pt"
    active_module: str = ""


@dataclass(frozen=True, slots=True)
class AiToolDefinition:
    name: str
    description: str
    mode: ToolMode
    required_groups: tuple[str, ...]
    available: bool = True


class AiTool:
    name: str = ""
    description_pt: str = ""
    description_en: str = ""
    required_groups: tuple[str, ...] = ()
    mode: ToolMode = "read"

    def definition(self, *, language: str = "pt", available: bool = True) -> AiToolDefinition:
        description = self.description_pt if language == "pt" else (self.description_en or self.description_pt)
        return AiToolDefinition(
            name=self.name,
            description=description,
            mode=self.mode,
            required_groups=self.required_groups,
            available=available,
        )

    def run(self, context: AiToolContext) -> dict[str, Any]:
        raise NotImplementedError
