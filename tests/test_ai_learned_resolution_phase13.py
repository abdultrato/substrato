from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.clarification_learning import (
    build_phase13_learned_resolution_report,
    resolve_learned_clarification,
)
from apps.ai_assistant.services.intent_router import AiIntentRouter
from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance
from apps.ai_assistant.services.registry import AiToolRegistry
from apps.ai_assistant.services.suggestion_learning import suggestion_key
from apps.ai_assistant.tools.finance import FinancialOperationalSummaryTool
from apps.ai_assistant.tools.reporting import PrepareOperationalReportTool


def _billing_focus() -> dict:
    return {
        "intent": "financial_review",
        "resources": [{"basename": "billing-invoice", "module": "billing"}],
        "modules": ["billing"],
        "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
    }


def _warehouse_focus() -> dict:
    return {
        "intent": "data_exploration",
        "resources": [{"basename": "warehouse-stock_level", "module": "warehouse"}],
        "modules": ["warehouse"],
        "filters": [],
    }


def _learning_for_prompt(*, focus: dict, prompt: str, selected=5, helpful=2) -> dict:
    guidance = build_proactive_guidance(conversation_focus=focus, language="pt")
    suggestion = next(item for item in guidance["suggestions"] if item["prompt"] == prompt)
    key = suggestion_key(suggestion)
    stats = {
        **suggestion,
        "id": key,
        "selected_count": selected,
        "positive_count": helpful,
        "negative_count": 0,
    }
    return {
        "by_suggestion": {key: stats},
        "events": [{"id": key, "event": "selected"} for _ in range(selected)],
        "total_events": selected + helpful,
        "scope": {"kind": "tenant_profile", "profile_key": "groups:contabilidade"},
    }


def test_phase13_auto_resolves_safe_learned_filter_into_ready_query():
    router = AiIntentRouter()
    registry = AiToolRegistry()
    learning = _learning_for_prompt(
        focus=_billing_focus(),
        prompt="Mostre faturas pendentes.",
    )
    decision = router.analyze(message="pendentes", active_module="ai")

    resolution = resolve_learned_clarification(
        decision=decision,
        learning=learning,
        original_message="pendentes",
    )
    resolved_decision = router.analyze(message=resolution.effective_message, active_module="ai")
    selected_tools = [
        tool.name
        for tool in registry.select_tools(
            message=resolution.effective_message,
            active_module="ai",
            learning=learning,
        )
    ]

    assert resolution.resolved is True
    assert resolution.reason == "dominant_safe_learned_option"
    assert resolution.effective_message == "Mostre faturas pendentes."
    assert resolved_decision.needs_clarification is False
    assert FinancialOperationalSummaryTool.name in selected_tools
    assert PrepareOperationalReportTool.name not in selected_tools


def test_phase13_blocks_sensitive_learned_report_prompt_from_auto_resolution():
    router = AiIntentRouter()
    learning = _learning_for_prompt(
        focus=_billing_focus(),
        prompt="Gere um relatorio financeiro desta investigacao.",
    )
    decision = router.analyze(message="Preciso ver isso", active_module="ai")

    resolution = resolve_learned_clarification(
        decision=decision,
        learning=learning,
        original_message="Preciso ver isso",
    )

    assert resolution.resolved is False
    assert resolution.blocked_reason == "sensitive_option_requires_user_choice"
    assert resolution.effective_message == "Preciso ver isso"


def test_phase13_auto_resolves_ambiguous_resource_to_dominant_module():
    router = AiIntentRouter()
    learning = _learning_for_prompt(
        focus=_warehouse_focus(),
        prompt="Mostre saldos abaixo do ponto de reposicao.",
    )
    decision = router.analyze(message="stock", active_module="ai")

    resolution = resolve_learned_clarification(
        decision=decision,
        learning=learning,
        original_message="stock",
    )
    resolved_decision = router.analyze(message=resolution.effective_message, active_module="ai")

    assert decision.intent == "ambiguous_resource"
    assert resolution.resolved is True
    assert resolution.reason == "dominant_learned_module"
    assert resolution.selected_module == "warehouse"
    assert resolution.effective_message == "stock warehouse"
    assert resolved_decision.needs_clarification is False
    assert (resolved_decision.signals or {})["resource_top_module"] == "warehouse"


def test_phase13_requires_dominant_score_before_auto_resolution():
    router = AiIntentRouter()
    billing = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.", selected=2, helpful=0)
    warehouse = _learning_for_prompt(
        focus=_warehouse_focus(),
        prompt="Mostre saldos abaixo do ponto de reposicao.",
        selected=2,
        helpful=0,
    )
    learning = {
        "by_suggestion": {**billing["by_suggestion"], **warehouse["by_suggestion"]},
        "events": [],
        "total_events": 4,
        "scope": {"kind": "tenant_profile", "profile_key": "groups:misto"},
    }

    resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
    )

    assert resolution.resolved is False
    assert resolution.blocked_reason == "option_score_below_threshold"


def test_phase13_report_and_command_json():
    report = build_phase13_learned_resolution_report()

    assert report["phase"] == 13
    assert report["summary"]["safe_resolved"] is True
    assert report["summary"]["sensitive_resolved"] is False
    assert report["summary"]["module_selected"] == "warehouse"

    output = StringIO()
    call_command("audit_ai_learned_resolution_phase13", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 13
    assert payload["summary"]["safe_effective_message"] == "Mostre faturas pendentes."
