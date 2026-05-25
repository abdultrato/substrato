from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

ToolMode = Literal["read", "prepare_action", "write_confirmed"]


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
