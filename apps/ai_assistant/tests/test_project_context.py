from __future__ import annotations

from apps.ai_assistant.services.cache import AiCacheManager
from apps.ai_assistant.services.intent_signals import build_intent_signals
from apps.ai_assistant.services.llm_gateway import LocalLlmGateway
from apps.ai_assistant.services.project_context import build_project_context_payload
from apps.ai_assistant.services.registry import AiToolRegistry


def test_project_context_payload_uses_memory_agents_and_sources() -> None:
    payload = build_project_context_payload(
        query="explique a arquitetura da IA deste projeto",
        active_module="ai",
    )

    context = payload["project_context"]

    assert context["memory"]["available"] is True
    assert context["agents"]
    assert context["matches"]
    assert payload["sources"]


def test_project_context_signal_and_registry_selection() -> None:
    message = "como funciona o módulo da IA no backend?"

    signals = build_intent_signals(message=message, active_module="ai")
    selected = AiToolRegistry().select_tools(message=message, active_module="ai")

    assert signals["project_context"] is True
    assert [tool.name for tool in selected] == ["search_project_context"]


def test_gateway_builds_project_context_answer() -> None:
    AiCacheManager.reset()
    gateway = LocalLlmGateway()
    tool_result = {
        "tool_name": "search_project_context",
        "result": build_project_context_payload(
            query="que agentes técnicos existem para o projeto?",
            active_module="ai",
        ),
    }

    answer = gateway.build_answer(
        question="que agentes técnicos existem para o projeto?",
        language="pt",
        tool_results=[tool_result],
        blocked_tools=[],
    )

    assert "contexto real do projeto" in answer
    assert "Agentes especialistas relevantes" in answer
    assert "Evidência interna usada" in answer
