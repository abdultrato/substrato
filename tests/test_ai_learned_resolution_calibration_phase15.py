from __future__ import annotations

from io import StringIO
import json
from types import SimpleNamespace

from django.core.management import call_command

from apps.ai_assistant.services.clarification_learning import (
    build_phase15_learned_resolution_calibration_report,
    learned_resolution_reliability_from_feedback,
    record_learned_resolution_feedback,
    resolve_learned_clarification,
)
from apps.ai_assistant.services.intent_router import AiIntentRouter
from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance
from apps.ai_assistant.services.suggestion_learning import (
    PROACTIVE_GUIDANCE_LEARNING_KEY,
    learning_from_metadata,
    suggestion_key,
)


class FakeSession:
    def __init__(self, *, metadata: dict | None = None) -> None:
        self.metadata = metadata or {}
        self.saved_update_fields: list[str] = []

    def refresh_from_db(self, fields=None):
        self.refreshed_fields = fields

    def save(self, update_fields=None):
        self.saved_update_fields = list(update_fields or [])


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


def test_phase15_repeated_negative_feedback_triggers_cooldown_before_exact_block():
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    session = FakeSession(metadata={PROACTIVE_GUIDANCE_LEARNING_KEY: learning})
    resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata=session.metadata,
    )

    record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=21),
        resolution=resolution.as_payload(),
        event="wrong",
        replacement_message="Mostre pendencias de enfermagem.",
        message_id=201,
    )
    feedback = record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=21),
        resolution=resolution.as_payload(),
        event="dismissed",
        message_id=202,
    )
    blocked = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning_from_metadata(session.metadata),
        original_message="pendentes",
        session_metadata=session.metadata,
    )

    assert resolution.resolved is True
    assert feedback["calibration"]["status"] == "cooldown"
    assert feedback["calibration"]["recent_negative_streak"] == 2
    assert blocked.resolved is False
    assert blocked.blocked_reason == "auto_resolution_feedback_cooldown"
    assert blocked.calibration["status"] == "cooldown"


def test_phase15_low_reliability_blocks_after_enough_mixed_feedback():
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    session = FakeSession(metadata={PROACTIVE_GUIDANCE_LEARNING_KEY: learning})
    resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata=session.metadata,
    )

    record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=22),
        resolution=resolution.as_payload(),
        event="wrong",
        message_id=301,
    )
    record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=22),
        resolution=resolution.as_payload(),
        event="accepted",
        message_id=302,
    )
    feedback = record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=22),
        resolution=resolution.as_payload(),
        event="corrected",
        replacement_message="Mostre faturas pagas.",
        message_id=303,
    )
    blocked = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata=session.metadata,
    )

    assert feedback["calibration"]["rated_events"] == 3
    assert feedback["calibration"]["reliability"] < 0.55
    assert feedback["calibration"]["recent_negative_streak"] == 1
    assert blocked.blocked_reason == "auto_resolution_low_reliability"


def test_phase15_positive_feedback_keeps_auto_resolution_available():
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    session = FakeSession(metadata={PROACTIVE_GUIDANCE_LEARNING_KEY: learning})
    resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata=session.metadata,
    )

    feedback = record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=23),
        resolution=resolution.as_payload(),
        event="accepted",
        message_id=401,
    )
    still_resolves = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning_from_metadata(session.metadata),
        original_message="pendentes",
        session_metadata=session.metadata,
    )

    assert feedback["calibration"]["status"] == "healthy"
    assert feedback["calibration"]["reliability"] == 1.0
    assert still_resolves.resolved is True
    assert still_resolves.calibration["status"] == "healthy"


def test_phase15_reliability_summary_handles_empty_feedback():
    calibration = learned_resolution_reliability_from_feedback(None)

    assert calibration["status"] == "unrated"
    assert calibration["reliability"] == 1.0
    assert calibration["rated_events"] == 0


def test_phase15_report_and_command_json():
    report = build_phase15_learned_resolution_calibration_report()

    assert report["phase"] == 15
    assert report["summary"]["initial_resolved"] is True
    assert report["summary"]["blocked_after_one_negative"] == "option_blocked_by_feedback"
    assert report["summary"]["cooldown_after_repeated_negative"] == "auto_resolution_feedback_cooldown"
    assert report["summary"]["accepted_still_resolves"] is True

    output = StringIO()
    call_command("audit_ai_learned_resolution_calibration_phase15", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 15
    assert payload["summary"]["session_guard_status"] == "cooldown"
