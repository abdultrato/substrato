from __future__ import annotations

from io import StringIO
import json
from types import SimpleNamespace

from django.core.management import call_command

from apps.ai_assistant.services.clarification_learning import (
    LEARNED_RESOLUTION_FEEDBACK_KEY,
    apply_learning_to_clarification,
    apply_resolution_feedback_repairs_to_clarification,
    build_phase17_resolution_feedback_repair_report,
    build_profile_learned_resolution_feedback_from_sessions,
    build_resolution_feedback_repair_options,
    resolve_learned_clarification,
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


def _user(user_id: int, group: str = "Contabilidade"):
    return SimpleNamespace(id=user_id, groups=[group])


def _feedback_metadata(*, events: tuple[str, ...], replacement_message: str = "") -> dict:
    rows = [
        {
            "event": event,
            "suggestion_id": "billing_pending",
            "module": "billing",
            "effective_message": "Mostre faturas pendentes.",
            "replacement_message": replacement_message,
            "message_id": index,
            "user_id": 1,
            "at": f"2026-05-31T00:00:0{index}+00:00",
        }
        for index, event in enumerate(events, start=1)
    ]
    return {
        LEARNED_RESOLUTION_FEEDBACK_KEY: {
            "blocked_suggestion_ids": {},
            "blocked_modules": {},
            "events": rows,
            "total_events": len(events),
            "accepted_count": len([event for event in events if event == "accepted"]),
            "negative_count": len([event for event in events if event in {"wrong", "corrected", "dismissed"}]),
        }
    }


def _session(session_id: int, user, events: tuple[str, ...], replacement_message: str = ""):
    return SimpleNamespace(
        id=session_id,
        user=user,
        metadata=_feedback_metadata(events=events, replacement_message=replacement_message),
    )


def test_phase17_session_correction_ranks_above_profile_repair_option():
    target = _user(1)
    same_profile = _user(2)
    session_metadata = _feedback_metadata(events=("wrong",), replacement_message="Mostre faturas vencidas.")
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, ("wrong",), "Mostre pendencias de enfermagem."),
            _session(2, same_profile, ("corrected",), "Mostre pendencias de enfermagem."),
        ],
        user=target,
    )

    repairs = build_resolution_feedback_repair_options(
        session_metadata=session_metadata,
        profile_feedback=profile_feedback,
        selected_module="billing",
        limit=2,
    )

    assert repairs[0]["prompt"] == "Mostre faturas vencidas."
    assert repairs[0]["source"] == "session"
    assert repairs[0]["session_count"] == 1
    assert repairs[1]["prompt"] == "Mostre pendencias de enfermagem."
    assert repairs[1]["profile_count"] == 2


def test_phase17_blocked_auto_resolution_uses_corrected_message_as_clarification_option():
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    target = _user(1)
    same_profile = _user(2)
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, ("wrong", "dismissed"), "Mostre pendencias de enfermagem."),
            _session(2, target, ("corrected",), "Mostre pendencias de enfermagem."),
        ],
        user=target,
    )
    decision = apply_learning_to_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        language="pt",
    )
    resolution = resolve_learned_clarification(
        decision=decision,
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
    )

    repaired = apply_resolution_feedback_repairs_to_clarification(
        decision=decision,
        session_metadata={},
        profile_feedback=profile_feedback,
        learned_resolution=resolution,
        language="pt",
    )
    metadata = (repaired.signals or {})["resolution_feedback_repair"]

    assert resolution.blocked_reason == "auto_resolution_profile_feedback_cooldown"
    assert repaired.options_pt[0] == "Mostre pendencias de enfermagem."
    assert "confiabilidade" in repaired.question_pt.lower()
    assert metadata["status"] == "applied"
    assert metadata["repair_options"][0]["profile_count"] == 3


def test_phase17_keeps_original_clarification_when_no_correction_exists():
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    decision = apply_learning_to_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        language="pt",
    )
    resolution = resolve_learned_clarification(
        decision=decision,
        learning=learning,
        original_message="pendentes",
        session_metadata=_feedback_metadata(events=("wrong",), replacement_message=""),
    )

    repaired = apply_resolution_feedback_repairs_to_clarification(
        decision=decision,
        session_metadata=_feedback_metadata(events=("wrong",), replacement_message=""),
        learned_resolution=resolution,
        language="pt",
    )

    assert repaired.options_pt == decision.options_pt
    assert "resolution_feedback_repair" not in (repaired.signals or {})


def test_phase17_report_and_command_json():
    report = build_phase17_resolution_feedback_repair_report()

    assert report["phase"] == 17
    assert report["summary"]["repair_applied"] is True
    assert report["summary"]["first_repair_option"] == "Mostre pendencias de enfermagem."
    assert report["summary"]["question_changed"] is True

    output = StringIO()
    call_command("audit_ai_resolution_feedback_repair_phase17", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 17
    assert payload["summary"]["repair_option_count"] == 1
