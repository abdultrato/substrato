from __future__ import annotations

import re
from typing import Any

from apps.ai_assistant.services.project_context import build_project_context_payload
from apps.ai_assistant.tools.resource_catalog import normalize_text

from .base import AiTool, AiToolContext

PROJECT_CONTEXT_TERMS = (
    "arquitetura",
    "arquitectura",
    "architecture",
    "codigo",
    "código",
    "code",
    "documentacao",
    "documentação",
    "docs",
    "backend",
    "frontend",
    "django",
    "next",
    "react",
    "api",
    "endpoint",
    "viewset",
    "serializer",
    "model",
    "models",
    "service",
    "servico",
    "serviço",
    "migrations",
    "migration",
    "testes",
    "tests",
    "docker",
    "deploy",
    "seguranca",
    "segurança",
    "security",
    "ddd",
    "clean architecture",
    "repository pattern",
    "service layer",
    "adr",
    "decisao",
    "decisão",
    "roadmap",
    "memoria",
    "memória",
    "modulo",
    "módulo",
    "estrutura",
    "pastas",
    "ficheiros",
    "arquivos",
)


class ProjectContextTool(AiTool):
    name = "search_project_context"
    description_pt = "Consulta documentação, código, memória, decisões e agentes do projeto para responder como IA especialista do projeto."
    description_en = "Searches project documentation, code, memory, decisions and agents to answer as a project-specialist AI."
    required_groups: tuple[str, ...] = ()
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        message = str(context.arguments.get("message") or "")
        original_message = str(context.arguments.get("original_message") or "")
        return build_project_context_payload(
            query=original_message or message,
            active_module=context.active_module,
            limit=8,
        )


def should_select_project_context(*, message: str, active_module: str = "") -> bool:
    normalized = normalize_text(f"{message or ''} {active_module or ''}")
    if not normalized:
        return False

    if _has_any(normalized, PROJECT_CONTEXT_TERMS):
        return True

    project_phrases = (
        r"\bcomo\s+funciona\s+(?:o\s+)?(?:modulo|módulo|sistema|projeto|projecto)\b",
        r"\bexplica(?:r)?\s+(?:a\s+)?(?:arquitetura|arquitectura|estrutura|implementacao|implementação)\b",
        r"\bonde\s+(?:esta|está|fica)\s+(?:o\s+)?(?:codigo|código|ficheiro|arquivo)\b",
        r"\bque\s+testes\s+(?:existem|devo|rodar|executar)\b",
    )
    return any(re.search(pattern, normalized) for pattern in project_phrases)


def _has_any(normalized: str, terms: tuple[str, ...]) -> bool:
    for term in terms:
        normalized_term = normalize_text(term)
        if not normalized_term:
            continue
        if len(normalized_term) <= 3:
            if re.search(rf"(?<!\w){re.escape(normalized_term)}(?!\w)", normalized):
                return True
            continue
        if normalized_term in normalized:
            return True
    return False
