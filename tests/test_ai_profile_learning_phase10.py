from __future__ import annotations

from io import StringIO
import json
from types import SimpleNamespace

from django.core.management import call_command

from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance
from apps.ai_assistant.services.suggestion_learning import (
    PROACTIVE_GUIDANCE_LEARNING_KEY,
    build_phase10_profile_learning_report,
    build_profile_learning_from_sessions,
    suggestion_key,
    summarize_learning,
    user_profile_key,
)


def _user(user_id: int, groups: list[str]):
    return SimpleNamespace(id=user_id, groups=groups)


def _session(session_id: int, user, suggestion: dict, *, selected=0, helpful=0, negative=0):
    key = suggestion_key(suggestion)
    stats = {
        "id": key,
        "prompt": suggestion["prompt"],
        "label": suggestion.get("label", ""),
        "kind": suggestion.get("kind", ""),
        "module": suggestion.get("module", ""),
        "resource_basename": suggestion.get("resource_basename", ""),
        "selected_count": selected,
        "positive_count": helpful,
        "negative_count": negative,
    }
    return SimpleNamespace(
        id=session_id,
        user=user,
        metadata={
            PROACTIVE_GUIDANCE_LEARNING_KEY: {
                "by_suggestion": {key: stats},
                "events": [{"id": key, "event": "selected"} for _ in range(selected)],
                "total_events": selected + helpful + negative,
            }
        },
    )


def _billing_focus() -> dict:
    return {
        "intent": "financial_review",
        "resources": [{"basename": "billing-invoice", "module": "billing"}],
        "modules": ["billing"],
        "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
    }


def test_phase10_profile_key_uses_normalized_groups():
    user = _user(1, ["Contabilidade", "Recepção", "Contabilidade"])

    assert user_profile_key(user) == "groups:contabilidade,recepcao"


def test_phase10_aggregates_same_profile_and_ignores_other_profile():
    baseline = build_proactive_guidance(conversation_focus=_billing_focus(), language="pt")
    pending = next(item for item in baseline["suggestions"] if item["prompt"] == "Mostre faturas pendentes.")
    report = next(item for item in baseline["suggestions"] if item["prompt"] == "Gere um relatorio financeiro desta investigacao.")
    user = _user(1, ["Contabilidade"])
    same_profile = _user(2, ["Contabilidade"])
    other_profile = _user(3, ["Farmácia"])

    learning = build_profile_learning_from_sessions(
        sessions=[
            _session(1, user, report, selected=1, helpful=1),
            _session(2, same_profile, report, selected=5, helpful=2),
            _session(3, other_profile, pending, selected=20, helpful=20),
        ],
        user=user,
        current_session_id=1,
    )
    learned = build_proactive_guidance(conversation_focus=_billing_focus(), language="pt", learning=learning)

    assert learning["scope"]["source_session_count"] == 2
    assert learning["scope"]["same_user_session_count"] == 1
    assert learned["suggestions"][0]["prompt"] == report["prompt"]
    assert learned["suggestions"][0]["learning"]["scope"] == "tenant_profile"
    assert learned["suggestions"][0]["learning"]["score"] > pending["learning"]["score"]


def test_phase10_learning_summary_exposes_profile_scope():
    user = _user(1, ["Contabilidade"])
    guidance = build_proactive_guidance(conversation_focus=_billing_focus(), language="pt")
    suggestion = guidance["suggestions"][0]
    learning = build_profile_learning_from_sessions(
        sessions=[_session(1, user, suggestion, selected=2)],
        user=user,
        current_session_id=1,
    )

    summary = summarize_learning(learning)

    assert summary["scope"]["kind"] == "tenant_profile"
    assert summary["top_suggestions"][0]["prompt"] == suggestion["prompt"]


def test_phase10_report_and_command_json():
    report = build_phase10_profile_learning_report()

    assert report["phase"] == 10
    assert report["summary"]["profile_first_prompt"] == "Gere um relatorio financeiro desta investigacao."
    assert report["summary"]["ignored_other_profile"] is True

    output = StringIO()
    call_command("audit_ai_profile_learning_phase10", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 10
    assert payload["summary"]["source_session_count"] == 2
