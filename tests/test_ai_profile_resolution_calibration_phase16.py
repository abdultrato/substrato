from __future__ import annotations

from io import StringIO
import json
from types import SimpleNamespace

from django.core.management import call_command

from apps.ai_assistant.services.clarification_learning import (
    LEARNED_RESOLUTION_FEEDBACK_KEY,
    build_phase16_profile_resolution_calibration_report,
    build_profile_learned_resolution_feedback_from_sessions,
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


def _user(user_id: int, group: str):
    return SimpleNamespace(id=user_id, groups=[group])


def _session(session_id: int, user, events: tuple[str, ...]):
    rows = [
        {
            "event": event,
            "suggestion_id": "billing_pending",
            "module": "billing",
            "effective_message": "Mostre faturas pendentes.",
            "replacement_message": "",
            "message_id": session_id * 100 + index,
            "user_id": getattr(user, "id", None),
            "at": f"2026-05-31T00:00:0{index}+00:00",
        }
        for index, event in enumerate(events, start=1)
    ]
    return SimpleNamespace(
        id=session_id,
        user=user,
        metadata={
            LEARNED_RESOLUTION_FEEDBACK_KEY: {
                "blocked_suggestion_ids": {},
                "blocked_modules": {},
                "events": rows,
                "total_events": len(events),
                "accepted_count": len([event for event in events if event == "accepted"]),
                "negative_count": len([event for event in events if event in {"wrong", "corrected", "dismissed"}]),
            }
        },
    )


def test_phase16_aggregates_resolution_feedback_by_profile_and_excludes_current_session():
    target = _user(1, "Contabilidade")
    same_profile = _user(2, "Contabilidade")
    other_profile = _user(3, "Farmacia")

    feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, ("wrong", "dismissed")),
            _session(2, target, ("corrected",)),
            _session(3, other_profile, ("accepted", "accepted")),
            _session(99, target, ("accepted",)),
        ],
        user=target,
        current_session_id=99,
    )

    assert feedback["scope"]["source_session_count"] == 2
    assert feedback["scope"]["same_user_session_count"] == 1
    assert feedback["negative_count"] == 3
    assert feedback["accepted_count"] == 0
    assert {item["source_session_id"] for item in feedback["events"]} == {1, 2}


def test_phase16_profile_cooldown_blocks_auto_resolution_without_session_feedback():
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    target = _user(1, "Contabilidade")
    same_profile = _user(2, "Contabilidade")
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, ("wrong", "dismissed")),
            _session(2, target, ("corrected",)),
        ],
        user=target,
    )

    blocked = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
    )

    assert blocked.resolved is False
    assert blocked.blocked_reason == "auto_resolution_profile_feedback_cooldown"
    assert blocked.calibration["block_scope"] == "profile"
    assert blocked.calibration["profile"]["status"] == "cooldown"


def test_phase16_profile_low_reliability_blocks_after_enough_mixed_feedback():
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    target = _user(1, "Contabilidade")
    same_profile = _user(2, "Contabilidade")
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, ("wrong", "accepted")),
            _session(2, target, ("corrected", "wrong")),
        ],
        user=target,
    )

    blocked = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
    )

    assert blocked.blocked_reason == "auto_resolution_profile_low_reliability"
    assert blocked.calibration["profile"]["rated_events"] == 4
    assert blocked.calibration["profile"]["recent_negative_streak"] == 2


def test_phase16_healthy_profile_feedback_keeps_auto_resolution_available():
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    target = _user(1, "Contabilidade")
    same_profile = _user(2, "Contabilidade")
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[_session(1, same_profile, ("accepted", "accepted", "accepted", "accepted"))],
        user=target,
    )

    resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
    )

    assert resolution.resolved is True
    assert resolution.calibration["profile"]["status"] == "healthy"
    assert resolution.calibration["profile"]["reliability"] == 1.0


def test_phase16_report_and_command_json():
    report = build_phase16_profile_resolution_calibration_report()

    assert report["phase"] == 16
    assert report["summary"]["blocked_by_profile"] == "auto_resolution_profile_feedback_cooldown"
    assert report["summary"]["block_scope"] == "profile"
    assert report["summary"]["healthy_profile_resolves"] is True

    output = StringIO()
    call_command("audit_ai_profile_resolution_calibration_phase16", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 16
    assert payload["summary"]["profile_guard_status"] == "cooldown"
