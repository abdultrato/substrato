from __future__ import annotations

from io import StringIO
import json
from types import SimpleNamespace

from django.core.management import call_command

from api.v1.ai.serializers import AiLearnedResolutionFeedbackSerializer
from apps.ai_assistant.services.clarification_learning import (
    build_phase14_learned_resolution_feedback_report,
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


def test_phase14_negative_feedback_blocks_auto_resolution_and_penalizes_suggestion():
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
        user=SimpleNamespace(id=9),
        resolution=resolution.as_payload(),
        event="wrong",
        replacement_message="Mostre pendencias de enfermagem.",
        message_id=123,
    )
    blocked = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning_from_metadata(session.metadata),
        original_message="pendentes",
        session_metadata=session.metadata,
    )
    option_id = resolution.selected_option["id"]
    stats = session.metadata[PROACTIVE_GUIDANCE_LEARNING_KEY]["by_suggestion"][option_id]

    assert resolution.resolved is True
    assert feedback["negative_count"] == 1
    assert option_id in feedback["blocked_suggestion_ids"]
    assert blocked.resolved is False
    assert blocked.blocked_reason == "option_blocked_by_feedback"
    assert stats["negative_count"] == 1
    assert stats["score"] == 13
    assert session.saved_update_fields == ["metadata", "updated_at"]


def test_phase14_positive_feedback_reinforces_without_blocking():
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
        user=SimpleNamespace(id=10),
        resolution=resolution.as_payload(),
        event="accepted",
    )
    still_resolves = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning_from_metadata(session.metadata),
        original_message="pendentes",
        session_metadata=session.metadata,
    )
    option_id = resolution.selected_option["id"]
    stats = session.metadata[PROACTIVE_GUIDANCE_LEARNING_KEY]["by_suggestion"][option_id]

    assert feedback["accepted_count"] == 1
    assert feedback["blocked_suggestion_ids"] == {}
    assert stats["positive_count"] == 3
    assert stats["score"] == 19
    assert still_resolves.resolved is True


def test_phase14_negative_module_feedback_blocks_dominant_module_resolution():
    router = AiIntentRouter()
    learning = _learning_for_prompt(
        focus=_warehouse_focus(),
        prompt="Mostre saldos abaixo do ponto de reposicao.",
    )
    session = FakeSession(metadata={PROACTIVE_GUIDANCE_LEARNING_KEY: learning})
    resolution = resolve_learned_clarification(
        decision=router.analyze(message="stock", active_module="ai"),
        learning=learning,
        original_message="stock",
        session_metadata=session.metadata,
    )

    feedback = record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=11),
        resolution=resolution.as_payload(),
        event="corrected",
        replacement_message="stock farmacia",
    )
    blocked = resolve_learned_clarification(
        decision=router.analyze(message="stock", active_module="ai"),
        learning=learning_from_metadata(session.metadata),
        original_message="stock",
        session_metadata=session.metadata,
    )

    assert resolution.reason == "dominant_learned_module"
    assert feedback["blocked_modules"]["warehouse"]["count"] == 1
    assert blocked.blocked_reason == "module_blocked_by_feedback"


def test_phase14_feedback_serializer_accepts_resolution_payload():
    serializer = AiLearnedResolutionFeedbackSerializer(
        data={
            "session_id": 1,
            "event": "wrong",
            "replacement_message": "Mostre faturas pagas.",
            "resolution": {
                "resolved": True,
                "effective_message": "Mostre faturas pendentes.",
                "selected_option": {"id": "billing_pending", "prompt": "Mostre faturas pendentes."},
            },
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["event"] == "wrong"


def test_phase14_report_and_command_json():
    report = build_phase14_learned_resolution_feedback_report()

    assert report["phase"] == 14
    assert report["summary"]["initial_resolved"] is True
    assert report["summary"]["blocked_after_feedback"] == "option_blocked_by_feedback"
    assert report["summary"]["option_negative_count"] == 1

    output = StringIO()
    call_command("audit_ai_learned_resolution_feedback_phase14", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 14
    assert payload["summary"]["feedback_negative_count"] == 1
