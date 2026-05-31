from __future__ import annotations

from io import StringIO
import json
from types import SimpleNamespace

from django.core.management import call_command

from api.v1.ai.serializers import AiSuggestionFeedbackSerializer
from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance
from apps.ai_assistant.services.suggestion_learning import (
    PROACTIVE_GUIDANCE_LEARNING_KEY,
    build_phase9_suggestion_learning_report,
    record_proactive_suggestion_feedback,
    suggestion_key,
)


class FakeSession:
    def __init__(self) -> None:
        self.metadata: dict = {}
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


def test_phase9_suggestions_have_stable_ids_and_learning_metadata():
    guidance = build_proactive_guidance(conversation_focus=_billing_focus(), language="pt")

    assert guidance["suggestions"]
    assert all(item.get("id") for item in guidance["suggestions"])
    assert all("learning" in item for item in guidance["suggestions"])
    assert suggestion_key(guidance["suggestions"][0]) == guidance["suggestions"][0]["id"]


def test_phase9_learning_prioritizes_previously_selected_suggestion():
    baseline = build_proactive_guidance(conversation_focus=_billing_focus(), language="pt")
    report_prompt = "Gere um relatorio financeiro desta investigacao."
    target = next(item for item in baseline["suggestions"] if item["prompt"] == report_prompt)
    key = suggestion_key(target)

    learned = build_proactive_guidance(
        conversation_focus=_billing_focus(),
        language="pt",
        learning={
            "by_suggestion": {
                key: {
                    "id": key,
                    "prompt": report_prompt,
                    "selected_count": 5,
                    "positive_count": 1,
                    "negative_count": 0,
                }
            },
            "events": [],
            "total_events": 6,
        },
    )

    assert baseline["suggestions"][0]["prompt"] != report_prompt
    assert learned["suggestions"][0]["prompt"] == report_prompt
    assert learned["suggestions"][0]["learning"]["score"] > 0


def test_phase9_records_suggestion_feedback_in_session_metadata():
    session = FakeSession()
    user = SimpleNamespace(id=7)
    suggestion = {
        "id": "billing_invoice_report",
        "kind": "report",
        "label": "Relatorio financeiro",
        "prompt": "Gere um relatorio financeiro desta investigacao.",
        "module": "billing",
        "resource_basename": "billing-invoice",
    }

    result = record_proactive_suggestion_feedback(
        session=session,
        user=user,
        suggestion=suggestion,
        event="selected",
        source="test",
        message_id=123,
    )

    learning = session.metadata[PROACTIVE_GUIDANCE_LEARNING_KEY]
    key = suggestion_key(suggestion)
    assert result["status"] == "recorded"
    assert learning["by_suggestion"][key]["selected_count"] == 1
    assert learning["events"][-1]["message_id"] == 123
    assert session.saved_update_fields == ["metadata", "updated_at"]


def test_phase9_feedback_serializer_accepts_prompt_fallback():
    serializer = AiSuggestionFeedbackSerializer(
        data={
            "session_id": 1,
            "event": "selected",
            "prompt": "Mostre faturas pendentes.",
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["suggestion"] == {"prompt": "Mostre faturas pendentes."}


def test_phase9_report_and_command_json():
    report = build_phase9_suggestion_learning_report()

    assert report["phase"] == 9
    assert report["summary"]["learned_first_prompt"] == "Gere um relatorio financeiro desta investigacao."

    output = StringIO()
    call_command("audit_ai_suggestion_learning_phase9", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 9
    assert payload["summary"]["learning_events"] == 4
