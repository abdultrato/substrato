from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.clarification_learning import (
    apply_learning_to_clarification,
    build_phase12_clarification_learning_report,
)
from apps.ai_assistant.services.intent_router import AiIntentRouter
from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance
from apps.ai_assistant.services.suggestion_learning import suggestion_key


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


def test_phase12_promotes_learned_prompt_into_vague_clarification():
    router = AiIntentRouter()
    decision = router.analyze(message="Preciso ver isso", active_module="ai")
    learning = _learning_for_prompt(
        focus=_billing_focus(),
        prompt="Gere um relatorio financeiro desta investigacao.",
    )

    learned = apply_learning_to_clarification(decision=decision, learning=learning, language="pt")

    assert learned.needs_clarification is True
    assert learned.options_pt[0] == "Gere um relatorio financeiro desta investigacao."
    assert "Quantos pacientes deram entrada hoje?" in learned.options_pt
    metadata = (learned.signals or {})["clarification_learning"]
    assert metadata["learned_options"][0]["module"] == "billing"
    assert metadata["scope"]["kind"] == "tenant_profile"


def test_phase12_ranks_ambiguous_module_options_with_profile_learning():
    router = AiIntentRouter()
    decision = router.analyze(message="stock", active_module="ai")
    learning = _learning_for_prompt(
        focus=_warehouse_focus(),
        prompt="Mostre saldos abaixo do ponto de reposicao.",
    )

    learned = apply_learning_to_clarification(decision=decision, learning=learning, language="pt")

    assert learned.intent == "ambiguous_resource"
    assert learned.options_pt[0] == "Armazém/Logística"
    assert "Farmácia" in learned.options_pt
    assert (learned.signals or {})["clarification_learning"]["module_weights"]["warehouse"] > 0


def test_phase12_short_operational_word_asks_scope_and_uses_profile_option():
    router = AiIntentRouter()
    decision = router.analyze(message="pendentes", active_module="ai")
    learning = _learning_for_prompt(
        focus=_billing_focus(),
        prompt="Mostre faturas pendentes.",
    )

    learned = apply_learning_to_clarification(decision=decision, learning=learning, language="pt")

    assert decision.intent == "underspecified_operational"
    assert learned.needs_clarification is True
    assert learned.options_pt[0] == "Mostre faturas pendentes."
    assert "pendencia" in learned.question_pt.lower()


def test_phase12_report_and_command_json():
    report = build_phase12_clarification_learning_report()

    assert report["phase"] == 12
    assert report["summary"]["short_status"] == "needs_clarification"
    assert report["summary"]["short_first_option"] == "Mostre faturas pendentes."

    output = StringIO()
    call_command("audit_ai_clarification_learning_phase12", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 12
    assert payload["summary"]["ambiguous_first_option"] == "Armazém/Logística"
