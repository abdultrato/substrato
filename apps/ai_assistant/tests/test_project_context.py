from __future__ import annotations

from apps.ai_assistant.services.cache import AiCacheManager
from apps.ai_assistant.services.intent_signals import build_intent_signals
from apps.ai_assistant.services.llm_gateway import LocalLlmGateway
from apps.ai_assistant.services.project_context import build_project_context_payload
from apps.ai_assistant.services.registry import AiToolRegistry


def _normalized_paths(payload) -> list[str]:
    return [str(item["path"]).replace("\\", "/") for item in payload["project_context"]["matches"]]


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
    assert "Fontes do projeto encontradas" in answer


def test_project_context_finds_reception_module_dossier() -> None:
    payload = build_project_context_payload(
        query="catalogue endpoint por endpoint da recepção, checkin, care e pagamento",
        active_module="reception",
    )

    paths = _normalized_paths(payload)

    assert any(path == "docs/ai/modules/reception.md" for path in paths)
    assert any(
        agent.get("key") in {"reception_ops", "backend"}
        for agent in payload["project_context"]["agents"]
    )


def test_project_context_finds_pharmacy_module_dossier() -> None:
    payload = build_project_context_payload(
        query="como funciona farmacia, lotes, requisicao material, avio e warehouse",
        active_module="pharmacy",
    )

    paths = _normalized_paths(payload)

    assert any(path == "docs/ai/modules/pharmacy.md" for path in paths)
    assert any(
        agent.get("key") in {"pharmacy_ops", "backend"}
        for agent in payload["project_context"]["agents"]
    )
