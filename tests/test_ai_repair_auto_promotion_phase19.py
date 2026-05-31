from __future__ import annotations

from io import StringIO
import json
from types import SimpleNamespace

from django.core.management import call_command

from apps.ai_assistant.services.clarification_learning import (
    LEARNED_RESOLUTION_FEEDBACK_KEY,
    apply_learning_to_clarification,
    build_phase19_repair_auto_promotion_report,
    build_profile_learned_resolution_feedback_from_sessions,
    resolve_learned_clarification,
    resolve_repair_auto_promotion,
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


def _user(user_id: int):
    return SimpleNamespace(id=user_id, groups=["Contabilidade"])


def _session(session_id: int, user, replacement_message: str, event: str = "wrong"):
    return SimpleNamespace(
        id=session_id,
        user=user,
        metadata={
            LEARNED_RESOLUTION_FEEDBACK_KEY: {
                "blocked_suggestion_ids": {},
                "blocked_modules": {},
                "events": [
                    {
                        "event": event,
                        "suggestion_id": "billing_pending",
                        "module": "billing",
                        "effective_message": "Mostre faturas pendentes.",
                        "replacement_message": replacement_message,
                        "message_id": session_id * 100,
                        "user_id": getattr(user, "id", None),
                        "at": f"2026-05-31T00:00:{session_id:02d}+00:00",
                    }
                ],
                "total_events": 1,
                "accepted_count": 0,
                "negative_count": 1,
            }
        },
    )


def _decision_and_blocked_resolution(profile_feedback: dict):
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    decision = apply_learning_to_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        language="pt",
    )
    blocked = resolve_learned_clarification(
        decision=decision,
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
    )
    return decision, blocked


def test_phase19_promotes_dominant_canonical_repair_to_effective_message():
    target = _user(1)
    same_profile = _user(2)
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, "pendencias enfermagem"),
            _session(2, same_profile, "Mostre pendencias de enfermagem.", "corrected"),
            _session(3, target, "Enfermagem pendentes", "dismissed"),
        ],
        user=target,
    )
    decision, blocked = _decision_and_blocked_resolution(profile_feedback)

    promoted = resolve_repair_auto_promotion(
        decision=decision,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
        learned_resolution=blocked,
    )

    assert blocked.blocked_reason == "auto_resolution_profile_feedback_cooldown"
    assert promoted.resolved is True
    assert promoted.reason == "dominant_canonical_feedback_repair"
    assert promoted.effective_message == "Mostre pendencias de enfermagem."
    assert promoted.selected_option["canonical_signature"] == "enfermagem pendencia"
    assert promoted.confidence_score >= 70


def test_phase19_single_session_repair_is_not_promoted_without_repeated_evidence():
    session_metadata = {
        LEARNED_RESOLUTION_FEEDBACK_KEY: {
            "blocked_suggestion_ids": {},
            "blocked_modules": {},
            "events": [
                {
                    "event": "wrong",
                    "suggestion_id": "billing_pending",
                    "module": "billing",
                    "effective_message": "Mostre faturas pendentes.",
                    "replacement_message": "Mostre pendencias de enfermagem.",
                    "message_id": 10,
                    "user_id": 1,
                    "at": "2026-05-31T00:00:10+00:00",
                }
            ],
            "total_events": 1,
            "accepted_count": 0,
            "negative_count": 1,
        }
    }
    decision, blocked = _decision_and_blocked_resolution({})

    promoted = resolve_repair_auto_promotion(
        decision=decision,
        original_message="pendentes",
        session_metadata=session_metadata,
        profile_feedback={},
        learned_resolution=blocked,
    )

    assert promoted.resolved is False
    assert promoted.blocked_reason == "repair_evidence_below_threshold"


def test_phase19_ambiguous_repair_candidates_are_not_promoted():
    target = _user(1)
    same_profile = _user(2)
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, "pendencias enfermagem"),
            _session(2, same_profile, "Mostre pendencias de enfermagem.", "corrected"),
            _session(3, target, "Enfermagem pendentes", "dismissed"),
            _session(4, same_profile, "faturas vencidas"),
            _session(5, same_profile, "Mostre faturas vencidas.", "corrected"),
            _session(6, target, "Faturas vencidas", "dismissed"),
        ],
        user=target,
    )
    decision, blocked = _decision_and_blocked_resolution(profile_feedback)

    promoted = resolve_repair_auto_promotion(
        decision=decision,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
        learned_resolution=blocked,
    )

    assert promoted.resolved is False
    assert promoted.blocked_reason == "repair_option_not_dominant"


def test_phase19_sensitive_repair_prompt_is_not_promoted():
    target = _user(1)
    same_profile = _user(2)
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, "Crie tarefa de enfermagem."),
            _session(2, same_profile, "Criar tarefa de enfermagem.", "corrected"),
            _session(3, target, "tarefa enfermagem", "dismissed"),
        ],
        user=target,
    )
    decision, blocked = _decision_and_blocked_resolution(profile_feedback)

    promoted = resolve_repair_auto_promotion(
        decision=decision,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
        learned_resolution=blocked,
    )

    assert promoted.resolved is False
    assert promoted.blocked_reason == "repair_option_sensitive"


def test_phase19_report_and_command_json():
    report = build_phase19_repair_auto_promotion_report()

    assert report["phase"] == 19
    assert report["summary"]["promoted"] is True
    assert report["summary"]["effective_message"] == "Mostre pendencias de enfermagem."
    assert report["summary"]["weak_evidence_block"] == "repair_score_below_threshold"

    output = StringIO()
    call_command("audit_ai_repair_auto_promotion_phase19", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 19
    assert payload["summary"]["promotion_reason"] == "dominant_canonical_feedback_repair"
