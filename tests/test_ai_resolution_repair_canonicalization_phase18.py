from __future__ import annotations

from io import StringIO
import json
from types import SimpleNamespace

from django.core.management import call_command

from apps.ai_assistant.services.clarification_learning import (
    LEARNED_RESOLUTION_FEEDBACK_KEY,
    apply_learning_to_clarification,
    apply_resolution_feedback_repairs_to_clarification,
    build_phase18_resolution_repair_canonicalization_report,
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


def _user(user_id: int):
    return SimpleNamespace(id=user_id, groups=["Contabilidade"])


def _session(session_id: int, user, event: str, replacement_message: str):
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
                        "at": f"2026-05-31T00:00:0{session_id}+00:00",
                    }
                ],
                "total_events": 1,
                "accepted_count": 0,
                "negative_count": 1,
            }
        },
    )


def _variant_profile_feedback():
    target = _user(1)
    same_profile = _user(2)
    return build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, "wrong", "pendencias enfermagem"),
            _session(2, same_profile, "corrected", "Mostre pendencias de enfermagem."),
            _session(3, target, "dismissed", "Enfermagem pendentes"),
        ],
        user=target,
    )


def test_phase18_groups_loose_correction_variants_under_one_canonical_repair():
    repairs = build_resolution_feedback_repair_options(
        session_metadata={},
        profile_feedback=_variant_profile_feedback(),
        selected_module="billing",
    )

    assert len(repairs) == 1
    assert repairs[0]["canonical_signature"] == "enfermagem pendencia"
    assert repairs[0]["variant_count"] == 3
    assert repairs[0]["score"] == 3
    assert repairs[0]["prompt"] == "Mostre pendencias de enfermagem."
    assert set(repairs[0]["canonical_terms"]) == {"enfermagem", "pendencia"}


def test_phase18_canonical_repair_becomes_first_clarification_option():
    router = AiIntentRouter()
    learning = _learning_for_prompt(focus=_billing_focus(), prompt="Mostre faturas pendentes.")
    profile_feedback = _variant_profile_feedback()
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
    assert metadata["repair_options"][0]["canonical_signature"] == "enfermagem pendencia"


def test_phase18_keeps_distinct_canonical_repairs_separate():
    target = _user(1)
    same_profile = _user(2)
    feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _session(1, same_profile, "wrong", "pendencias enfermagem"),
            _session(2, same_profile, "corrected", "Mostre faturas vencidas."),
            _session(3, target, "dismissed", "Enfermagem pendentes"),
        ],
        user=target,
    )

    repairs = build_resolution_feedback_repair_options(
        session_metadata={},
        profile_feedback=feedback,
        selected_module="billing",
    )

    signatures = {item["canonical_signature"] for item in repairs}
    assert signatures == {"enfermagem pendencia", "fatura vencida vencidas"}
    assert repairs[0]["canonical_signature"] == "enfermagem pendencia"


def test_phase18_report_and_command_json():
    report = build_phase18_resolution_repair_canonicalization_report()

    assert report["phase"] == 18
    assert report["summary"]["canonical_repair_count"] == 1
    assert report["summary"]["top_variant_count"] == 3
    assert report["summary"]["top_prompt"] == "Mostre pendencias de enfermagem."

    output = StringIO()
    call_command("audit_ai_resolution_repair_canonicalization_phase18", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 18
    assert payload["summary"]["top_signature"] == "enfermagem pendencia"
