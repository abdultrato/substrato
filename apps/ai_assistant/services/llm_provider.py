"""Seleção de provedor de LLM da IA operacional.

Por omissão usa o `LocalLlmGateway` (determinístico, sem rede — não envia dados
sensíveis a terceiros). Quando `AI_PROVIDER=anthropic` e há SDK + chave, usa um
provedor Claude real que **compõe** a resposta a partir das evidências das
ferramentas (tool_results), mantendo a disciplina de evidência/limitação.

Princípio de robustez: qualquer falha do provedor externo cai para o local —
o assistente nunca fica indisponível por causa do LLM.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from django.conf import settings

from apps.ai_assistant.services.llm_gateway import LocalLlmGateway
from apps.ai_assistant.services.natural_bridge import polish_natural_answer

logger = logging.getLogger("ai_assistant.llm")

_SYSTEM_PT = (
    "És o assistente operacional do Substrato, uma plataforma multi-tenant de saúde, "
    "laboratório, ERP/WMS, educação e backoffice.\n"
    "Regras invioláveis:\n"
    "1. Responde APENAS com base nas evidências fornecidas (resultados de ferramentas). "
    "Nunca inventes dados, números, nomes de pacientes ou estados que não estejam nas evidências.\n"
    "2. Se as evidências forem insuficientes, di-lo claramente e sugere o próximo passo.\n"
    "3. Termina sempre com três linhas: 'Evidência interna usada: ...', 'Limitação: ...' e "
    "'Próximo passo sugerido: ...'.\n"
    "4. Sê conciso e directo. Devolve apenas a resposta final, sem raciocínio interno."
)

_SYSTEM_EN = (
    "You are the operational assistant of Substrato, a multi-tenant platform for health, "
    "laboratory, ERP/WMS, education and backoffice.\n"
    "Inviolable rules:\n"
    "1. Answer ONLY from the provided evidence (tool results). Never invent data, numbers, "
    "patient names or states that are not in the evidence.\n"
    "2. If the evidence is insufficient, say so clearly and suggest the next step.\n"
    "3. Always end with three lines: 'Internal evidence used: ...', 'Limitation: ...' and "
    "'Suggested next step: ...'.\n"
    "4. Be concise and direct. Return only the final answer, without internal reasoning."
)


class AnthropicLlmGateway:
    """Provedor Claude real, com a mesma interface do LocalLlmGateway."""

    provider = "anthropic"

    def __init__(self) -> None:
        self._local = LocalLlmGateway()  # cache + polish + fallback
        self._client = None

    # -- disponibilidade ------------------------------------------------
    def available(self) -> bool:
        if not (getattr(settings, "ANTHROPIC_API_KEY", "") or "").strip():
            return False
        try:
            import anthropic  # noqa: F401
        except Exception:  # noqa: BLE001
            return False
        return True

    def _get_client(self):
        if self._client is None:
            import anthropic

            self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._client

    # -- composição -----------------------------------------------------
    def build_answer(
        self,
        *,
        question: str,
        language: str,
        tool_results: list[dict[str, Any]],
        blocked_tools: list[dict[str, Any]] | None = None,
        natural_bridge: dict[str, Any] | None = None,
    ) -> str:
        # Reaproveita o cache do provedor local (chave determinística).
        cache_key = self._local._get_cache_key(question, language, tool_results, blocked_tools, natural_bridge)
        cached = self._local._get_from_cache(cache_key)
        if cached is not None:
            return cached

        try:
            answer = self._compose_with_claude(
                question=question,
                language=language,
                tool_results=tool_results,
                blocked_tools=blocked_tools or [],
            )
            polished = polish_natural_answer(answer=answer, bridge=natural_bridge, language=language)
            return self._local._save_to_cache(cache_key, polished)
        except Exception:  # noqa: BLE001
            # Degradação robusta: cai para o provedor determinístico local.
            logger.exception("Falha no provedor Claude; usando resposta local.")
            return self._local.build_answer(
                question=question,
                language=language,
                tool_results=tool_results,
                blocked_tools=blocked_tools,
                natural_bridge=natural_bridge,
            )

    def _compose_with_claude(self, *, question, language, tool_results, blocked_tools) -> str:
        client = self._get_client()
        model = (getattr(settings, "AI_MODEL", "") or "").strip() or "claude-opus-4-8"
        max_tokens = int(getattr(settings, "AI_MAX_TOKENS", 1500) or 1500)
        system = _SYSTEM_EN if language == "en" else _SYSTEM_PT

        evidence = json.dumps(
            {"tool_results": tool_results, "blocked_tools": blocked_tools},
            ensure_ascii=False, sort_keys=True, default=str,
        )
        label_q = "Question" if language == "en" else "Pergunta"
        label_e = "Evidence (tool results)" if language == "en" else "Evidências (resultados de ferramentas)"
        user_content = f"{label_q}: {question}\n\n{label_e}:\n{evidence}"

        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_content}],
        )
        parts = [block.text for block in response.content if getattr(block, "type", None) == "text"]
        text = "\n".join(part for part in parts if part).strip()
        if not text:
            raise ValueError("Resposta vazia do provedor Claude.")
        return text


def get_llm_gateway():
    """Devolve o provedor de LLM conforme `AI_PROVIDER` (com fallback local)."""
    provider = (getattr(settings, "AI_PROVIDER", "local") or "local").strip().lower()
    if provider == "anthropic":
        gateway = AnthropicLlmGateway()
        if gateway.available():
            return gateway
        logger.warning(
            "AI_PROVIDER=anthropic mas o SDK 'anthropic' ou ANTHROPIC_API_KEY não estão "
            "disponíveis; a usar o provedor local determinístico."
        )
    return LocalLlmGateway()
