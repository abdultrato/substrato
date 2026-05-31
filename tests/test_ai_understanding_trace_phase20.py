from __future__ import annotations

from io import StringIO
import json
from types import SimpleNamespace

from django.core.management import call_command

from apps.ai_assistant.services.understanding_trace import (
    build_phase20_understanding_trace_report,
    build_understanding_trace,
)


def test_phase20_trace_explains_loose_input_and_learned_repair_promotion():
    trace = build_understanding_trace(
        original_message="pendentes",
        effective_message="Mostre pendencias de enfermagem.",
        active_module="ai",
        language="pt",
        status="answered",
        intent_decision=SimpleNamespace(
            signals={"short": True, "operational": True},
            as_payload=lambda language="pt": {
                "status": "answered",
                "intent": "operational_status",
                "confidence_score": 82,
            },
        ),
        followup_resolution={"resolved": False},
        learned_resolution={
            "resolved": True,
            "reason": "dominant_canonical_feedback_repair",
            "effective_message": "Mostre pendencias de enfermagem.",
            "confidence_score": 82,
        },
        profile_learning={"by_suggestion": {"billing_pending": {}}, "scope": {"kind": "tenant_profile"}},
        profile_resolution_feedback={
            "events": [{"event": "wrong"}, {"event": "corrected"}, {"event": "dismissed"}],
            "accepted_count": 0,
            "negative_count": 3,
            "total_events": 3,
            "scope": {"kind": "tenant_profile_resolution_feedback"},
        },
        selected_tools=[SimpleNamespace(name="nursing_pending_work", mode="read")],
        blocked_tools=[],
        tool_results=[{"tool_name": "nursing_pending_work"}],
    )

    assert trace["status"] == "available"
    assert trace["phase"] == 20
    assert trace["loose_input"] is True
    assert trace["message_changed"] is True
    assert trace["safety"]["learned_resolution_reason"] == "dominant_canonical_feedback_repair"
    assert trace["selected_tools"][0]["name"] == "nursing_pending_work"
    assert any(step["stage"] == "learned_resolution" for step in trace["decision_path"])
    assert "Entendido como" in trace["summary_pt"]


def test_phase20_trace_records_clarification_instead_of_tool_execution():
    trace = build_understanding_trace(
        original_message="isso",
        effective_message="isso",
        active_module="ai",
        language="pt",
        status="needs_clarification",
        intent_decision={
            "status": "needs_clarification",
            "intent": "ambiguous_reference",
            "confidence_score": 45,
            "signals": {"ambiguous_reference": True, "short": True},
        },
        followup_resolution={"resolved": False},
        learned_resolution={"resolved": False, "blocked_reason": "no_learned_option"},
        profile_learning={},
        profile_resolution_feedback={},
        selected_tools=[],
        blocked_tools=[],
        tool_results=[],
    )

    assert trace["needs_clarification"] is True
    assert trace["selected_tools"] == []
    assert any(step["stage"] == "clarification" for step in trace["decision_path"])
    assert trace["safety"]["learned_resolution_blocked_reason"] == "no_learned_option"


def test_phase20_report_and_command_json():
    report = build_phase20_understanding_trace_report()

    assert report["phase"] == 20
    assert report["summary"]["trace_status"] == "available"
    assert report["summary"]["loose_input"] is True
    assert report["summary"]["learning_reason"] == "dominant_canonical_feedback_repair"
    assert report["trace"]["selected_tools"][0]["name"] == "nursing_pending_work"

    output = StringIO()
    call_command("audit_ai_understanding_trace_phase20", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 20
    assert payload["summary"]["decision_steps"] >= 4
