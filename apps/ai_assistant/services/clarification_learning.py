from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import Any

from apps.ai_assistant.services.alias_normalization import alias_tokens, normalize_alias_text
from apps.ai_assistant.services.intent_router import MODULE_OPTIONS_EN, MODULE_OPTIONS_PT, IntentDecision
from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance
from apps.ai_assistant.services.suggestion_learning import (
    PROACTIVE_GUIDANCE_LEARNING_KEY,
    learning_from_metadata,
    record_proactive_suggestion_feedback,
    suggestion_key,
    user_profile_groups,
    user_profile_key,
)

CLARIFICATION_LEARNING_MIN_SCORE = 4
LEARNED_OPTION_LIMIT = 3
LEARNED_RESOLUTION_FEEDBACK_KEY = "learned_clarification_resolution_feedback"
VALID_LEARNED_RESOLUTION_FEEDBACK_EVENTS = ("accepted", "wrong", "corrected", "dismissed")
AUTO_RESOLUTION_MIN_SCORE = 14
AUTO_RESOLUTION_DOMINANCE_MARGIN = 4
AUTO_RESOLUTION_FEEDBACK_COOLDOWN_STREAK = 2
AUTO_RESOLUTION_RELIABILITY_MIN_EVENTS = 3
AUTO_RESOLUTION_MIN_RELIABILITY = 0.55
PROFILE_AUTO_RESOLUTION_FEEDBACK_COOLDOWN_STREAK = 3
PROFILE_AUTO_RESOLUTION_RELIABILITY_MIN_EVENTS = 4
PROFILE_AUTO_RESOLUTION_MIN_RELIABILITY = 0.5
PROFILE_LEARNED_RESOLUTION_FEEDBACK_SCOPE = "tenant_profile_resolution_feedback"
REPAIR_OPTION_LIMIT = 3
REPAIR_AUTO_PROMOTION_MIN_SCORE = 3
REPAIR_AUTO_PROMOTION_MIN_EVIDENCE = 3
REPAIR_AUTO_PROMOTION_DOMINANCE_MARGIN = 2
REPAIR_FEEDBACK_EVENTS = {"wrong", "corrected", "dismissed"}
REPAIR_SIGNATURE_STOPWORDS = {
    "a",
    "as",
    "com",
    "criar",
    "crie",
    "da",
    "das",
    "de",
    "do",
    "dos",
    "em",
    "liste",
    "listar",
    "mostra",
    "mostre",
    "mostrar",
    "na",
    "nas",
    "no",
    "nos",
    "o",
    "os",
    "para",
    "por",
    "quero",
    "ver",
    "veja",
}
REPAIR_TOKEN_ALIASES = {
    "factura": "fatura",
    "facturas": "fatura",
    "faturas": "fatura",
    "pendencia": "pendencia",
    "pendencias": "pendencia",
    "pendente": "pendencia",
    "pendentes": "pendencia",
}
FEEDBACK_BLOCK_REASONS = {
    "option_blocked_by_feedback",
    "module_blocked_by_feedback",
    "auto_resolution_feedback_cooldown",
    "auto_resolution_low_reliability",
    "auto_resolution_profile_feedback_cooldown",
    "auto_resolution_profile_low_reliability",
}
AUTO_RESOLVABLE_INTENTS = {
    "ambiguous_reference",
    "ambiguous_resource",
    "broad_request",
    "underspecified",
    "underspecified_operational",
}
AUTO_SAFE_KINDS = {"filter", "question"}
SENSITIVE_AUTO_TERMS = (
    "relatorio",
    "report",
    "export",
    "tarefa",
    "task",
    "criar",
    "crie",
    "adicione",
    "adicionar",
    "actualizar",
    "atualizar",
    "alterar",
    "editar",
    "remover",
    "eliminar",
    "apagar",
)


@dataclass(frozen=True, slots=True)
class LearnedClarificationResolution:
    original_message: str
    effective_message: str
    resolved: bool = False
    reason: str = ""
    blocked_reason: str = ""
    selected_module: str = ""
    selected_option: dict[str, Any] | None = None
    confidence_score: int = 0
    calibration: dict[str, Any] | None = None

    def as_payload(self) -> dict[str, Any]:
        return {
            "original_message": self.original_message,
            "effective_message": self.effective_message,
            "resolved": self.resolved,
            "reason": self.reason,
            "blocked_reason": self.blocked_reason,
            "selected_module": self.selected_module,
            "selected_option": self.selected_option or {},
            "confidence_score": self.confidence_score,
            "calibration": self.calibration or {},
        }


def apply_learning_to_clarification(
    *,
    decision: IntentDecision,
    learning: dict[str, Any] | None,
    language: str = "pt",
    limit: int = 6,
) -> IntentDecision:
    if not decision.needs_clarification:
        return decision

    signals = decision.signals or {}
    profile = build_clarification_learning_profile(learning=learning, signals=signals)
    if not profile["learned_options"] and not profile["module_weights"]:
        return decision

    if decision.intent == "ambiguous_resource":
        options_pt = _rank_module_options(decision.options_pt, module_weights=profile["module_weights"], language="pt")
        options_en = _rank_module_options(decision.options_en, module_weights=profile["module_weights"], language="en")
        question_pt = decision.question_pt
        question_en = decision.question_en
    else:
        learned_prompts = [item["prompt"] for item in profile["learned_options"]]
        options_pt = _merge_options(learned_prompts, decision.options_pt, limit=limit)
        options_en = _merge_options(learned_prompts, decision.options_en, limit=limit)
        question_pt = _learned_question_pt(decision)
        question_en = _learned_question_en(decision)

    learned_signals = {
        **signals,
        "clarification_learning": {
            "status": "applied",
            "scope": profile["scope"],
            "learned_options": profile["learned_options"],
            "module_weights": profile["module_weights"],
        },
    }
    return replace(
        decision,
        question_pt=question_pt,
        question_en=question_en,
        options_pt=tuple(options_pt),
        options_en=tuple(options_en),
        signals=learned_signals,
    )


def apply_resolution_feedback_repairs_to_clarification(
    *,
    decision: IntentDecision,
    session_metadata: dict[str, Any] | None = None,
    profile_feedback: dict[str, Any] | None = None,
    learned_resolution: LearnedClarificationResolution | dict[str, Any] | None = None,
    language: str = "pt",
    limit: int = 6,
) -> IntentDecision:
    if not decision.needs_clarification:
        return decision

    resolution_payload = learned_resolution.as_payload() if isinstance(learned_resolution, LearnedClarificationResolution) else (learned_resolution or {})
    block_reason = str(resolution_payload.get("blocked_reason") or "").strip()
    if block_reason and block_reason not in FEEDBACK_BLOCK_REASONS:
        return decision

    repair_options = build_resolution_feedback_repair_options(
        session_metadata=session_metadata,
        profile_feedback=profile_feedback,
        selected_module=str(resolution_payload.get("selected_module") or ""),
        limit=REPAIR_OPTION_LIMIT,
    )
    if not repair_options:
        return decision

    prompts = [item["prompt"] for item in repair_options]
    signals = decision.signals or {}
    learned_signals = {
        **signals,
        "resolution_feedback_repair": {
            "status": "applied",
            "blocked_reason": block_reason,
            "repair_options": repair_options,
        },
    }
    return replace(
        decision,
        question_pt=_repair_question_pt(block_reason),
        question_en=_repair_question_en(block_reason),
        options_pt=tuple(_merge_options(prompts, decision.options_pt, limit=limit)),
        options_en=tuple(_merge_options(prompts, decision.options_en, limit=limit)),
        signals=learned_signals,
    )


def resolve_repair_auto_promotion(
    *,
    decision: IntentDecision,
    original_message: str,
    session_metadata: dict[str, Any] | None = None,
    profile_feedback: dict[str, Any] | None = None,
    learned_resolution: LearnedClarificationResolution | dict[str, Any] | None = None,
    language: str = "pt",
) -> LearnedClarificationResolution:
    original = str(original_message or "").strip()
    resolution_payload = learned_resolution.as_payload() if isinstance(learned_resolution, LearnedClarificationResolution) else (learned_resolution or {})
    block_reason = str(resolution_payload.get("blocked_reason") or "").strip()
    if not decision.needs_clarification:
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=original,
            blocked_reason="decision_ready",
        )
    if block_reason and block_reason not in FEEDBACK_BLOCK_REASONS:
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=original,
            blocked_reason="repair_promotion_not_applicable",
        )

    repairs = build_resolution_feedback_repair_options(
        session_metadata=session_metadata,
        profile_feedback=profile_feedback,
        selected_module=str(resolution_payload.get("selected_module") or ""),
    )
    option, blocked = _dominant_repair_promotion_option(repairs)
    if not option:
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=original,
            blocked_reason=blocked or "no_repair_promotion_option",
            selected_option=repairs[0] if repairs else None,
        )

    prompt = str(option.get("prompt") or "").strip()
    return LearnedClarificationResolution(
        original_message=original,
        effective_message=prompt,
        resolved=True,
        reason="dominant_canonical_feedback_repair",
        selected_module=str(option.get("module") or ""),
        selected_option={**option, "promotion_language": language},
        confidence_score=_repair_promotion_confidence(option),
    )


def resolve_learned_clarification(
    *,
    decision: IntentDecision,
    learning: dict[str, Any] | None,
    original_message: str,
    language: str = "pt",
    session_metadata: dict[str, Any] | None = None,
    profile_feedback: dict[str, Any] | None = None,
) -> LearnedClarificationResolution:
    original = str(original_message or "").strip()
    guard = learned_resolution_feedback_from_metadata(session_metadata)
    calibration = combine_learned_resolution_calibration(
        session_feedback=guard,
        profile_feedback=profile_feedback,
    )
    if not decision.needs_clarification:
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=original,
            blocked_reason="decision_ready",
            calibration=calibration,
        )
    if decision.intent not in AUTO_RESOLVABLE_INTENTS:
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=original,
            blocked_reason="intent_not_auto_resolvable",
            calibration=calibration,
        )

    profile = build_clarification_learning_profile(learning=learning, signals=decision.signals or {})
    if decision.intent == "ambiguous_resource":
        module, score, blocked = _dominant_module(profile["module_weights"])
        if not module:
            return LearnedClarificationResolution(
                original_message=original,
                effective_message=original,
                blocked_reason=blocked or "no_dominant_module",
                calibration=calibration,
            )
        feedback_block = auto_resolution_feedback_block_reason(calibration)
        if feedback_block:
            return LearnedClarificationResolution(
                original_message=original,
                effective_message=original,
                blocked_reason=feedback_block,
                selected_module=module,
                confidence_score=_resolution_confidence(score),
                calibration=calibration,
            )
        if module in (guard.get("blocked_modules") or {}):
            return LearnedClarificationResolution(
                original_message=original,
                effective_message=original,
                blocked_reason="module_blocked_by_feedback",
                selected_module=module,
                calibration=calibration,
            )
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=f"{original} {module}".strip(),
            resolved=True,
            reason="dominant_learned_module",
            selected_module=module,
            confidence_score=_resolution_confidence(score),
            calibration=calibration,
        )

    feedback_block = auto_resolution_feedback_block_reason(calibration)
    if feedback_block and profile["learned_options"]:
        selected_option = _blocked_option_from_feedback(profile["learned_options"], guard) or profile["learned_options"][0]
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=original,
            blocked_reason=feedback_block,
            selected_module=str(selected_option.get("module") or ""),
            selected_option=selected_option,
            confidence_score=_resolution_confidence(int(selected_option.get("score") or 0)),
            calibration=calibration,
        )

    blocked_option = _blocked_option_from_feedback(profile["learned_options"], guard)
    if blocked_option:
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=original,
            blocked_reason="option_blocked_by_feedback",
            selected_module=str(blocked_option.get("module") or ""),
            selected_option=blocked_option,
            calibration=calibration,
        )

    option, blocked = _dominant_safe_option(profile["learned_options"])
    if not option:
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=original,
            blocked_reason=blocked or "no_safe_learned_option",
            calibration=calibration,
        )
    option_id = str(option.get("id") or suggestion_key(option))
    if option_id in (guard.get("blocked_suggestion_ids") or {}):
        return LearnedClarificationResolution(
            original_message=original,
            effective_message=original,
            blocked_reason="option_blocked_by_feedback",
            selected_module=str(option.get("module") or ""),
            selected_option=option,
            calibration=calibration,
        )
    prompt = str(option.get("prompt") or "").strip()
    return LearnedClarificationResolution(
        original_message=original,
        effective_message=prompt,
        resolved=True,
        reason="dominant_safe_learned_option",
        selected_module=str(option.get("module") or ""),
        selected_option=option,
        confidence_score=_resolution_confidence(int(option.get("score") or 0)),
        calibration=calibration,
    )


def build_clarification_learning_profile(
    *,
    learning: dict[str, Any] | None,
    signals: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = learning_from_metadata({"proactive_guidance_learning": learning or {}})
    signals = signals or {}
    context_modules = _context_modules(signals)
    learned_options = []
    module_weights: Counter[str] = Counter()

    for key, stats in (payload.get("by_suggestion") or {}).items():
        if not isinstance(stats, dict):
            continue
        score = _score(stats)
        if score < CLARIFICATION_LEARNING_MIN_SCORE:
            continue

        prompt = str(stats.get("prompt") or stats.get("label") or "").strip()
        module = _module_from_stats(stats)
        if module:
            module_weights[module] += score
        if not prompt:
            continue
        if context_modules and module and module not in context_modules:
            continue
        learned_options.append(
            {
                "id": str(stats.get("id") or key),
                "prompt": prompt,
                "label": str(stats.get("label") or "")[:180],
                "kind": str(stats.get("kind") or "")[:80],
                "module": module,
                "resource_basename": str(stats.get("resource_basename") or "")[:160],
                "score": score,
            }
        )

    learned_options = _dedupe_option_payloads(learned_options)
    learned_options = sorted(learned_options, key=lambda item: (-int(item["score"]), str(item["prompt"])))[:LEARNED_OPTION_LIMIT]
    return {
        "scope": payload.get("scope") or {},
        "learned_options": learned_options,
        "module_weights": dict(sorted(module_weights.items())),
    }


def learned_resolution_feedback_from_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    value = (metadata or {}).get(LEARNED_RESOLUTION_FEEDBACK_KEY)
    if not isinstance(value, dict):
        return {
            "blocked_suggestion_ids": {},
            "blocked_modules": {},
            "events": [],
            "total_events": 0,
            "accepted_count": 0,
            "negative_count": 0,
            "scope": {},
        }
    return {
        "blocked_suggestion_ids": value.get("blocked_suggestion_ids") if isinstance(value.get("blocked_suggestion_ids"), dict) else {},
        "blocked_modules": value.get("blocked_modules") if isinstance(value.get("blocked_modules"), dict) else {},
        "events": value.get("events")[-80:] if isinstance(value.get("events"), list) else [],
        "total_events": int(value.get("total_events") or 0),
        "accepted_count": int(value.get("accepted_count") or 0),
        "negative_count": int(value.get("negative_count") or 0),
        "scope": value.get("scope") if isinstance(value.get("scope"), dict) else {},
    }


def learned_resolution_reliability_from_feedback(
    feedback: dict[str, Any] | None,
    *,
    min_reliability: float = AUTO_RESOLUTION_MIN_RELIABILITY,
    min_events: int = AUTO_RESOLUTION_RELIABILITY_MIN_EVENTS,
    cooldown_streak: int = AUTO_RESOLUTION_FEEDBACK_COOLDOWN_STREAK,
) -> dict[str, Any]:
    payload = _coerce_learned_resolution_feedback(feedback)
    accepted = int(payload.get("accepted_count") or 0)
    negative = int(payload.get("negative_count") or 0)
    rated = accepted + negative
    reliability = round(accepted / rated, 3) if rated else 1.0
    recent_negative_streak = _recent_negative_feedback_streak(payload.get("events") or [])
    status = "unrated"
    if rated:
        status = "healthy" if reliability >= min_reliability else "low_reliability"
    if recent_negative_streak >= cooldown_streak:
        status = "cooldown"
    elif rated >= min_events and reliability < min_reliability:
        status = "low_reliability"

    return {
        "status": status,
        "reliability": reliability,
        "rated_events": rated,
        "accepted_count": accepted,
        "negative_count": negative,
        "recent_negative_streak": recent_negative_streak,
        "min_reliability": min_reliability,
        "min_events": min_events,
        "cooldown_streak": cooldown_streak,
    }


def combine_learned_resolution_calibration(
    *,
    session_feedback: dict[str, Any] | None,
    profile_feedback: dict[str, Any] | None = None,
) -> dict[str, Any]:
    session_calibration = learned_resolution_reliability_from_feedback(session_feedback)
    profile_payload = _coerce_learned_resolution_feedback(profile_feedback)
    has_profile_feedback = bool(
        profile_feedback
        and (
            int(profile_payload.get("total_events") or 0)
            or int(profile_payload.get("accepted_count") or 0)
            or int(profile_payload.get("negative_count") or 0)
            or profile_payload.get("events")
        )
    )
    profile_calibration = (
        learned_resolution_reliability_from_feedback(
            profile_payload,
            min_reliability=PROFILE_AUTO_RESOLUTION_MIN_RELIABILITY,
            min_events=PROFILE_AUTO_RESOLUTION_RELIABILITY_MIN_EVENTS,
            cooldown_streak=PROFILE_AUTO_RESOLUTION_FEEDBACK_COOLDOWN_STREAK,
        )
        if has_profile_feedback
        else {}
    )

    session_block = auto_resolution_feedback_block_reason(session_calibration)
    profile_block = auto_resolution_feedback_block_reason(profile_calibration) if has_profile_feedback else ""
    block_reason = session_block
    block_scope = "session" if session_block else ""
    selected = session_calibration
    if not block_reason and profile_block:
        block_reason = _profile_feedback_block_reason(profile_block)
        block_scope = "profile"
        selected = profile_calibration
    elif not block_reason and session_calibration["status"] == "unrated" and has_profile_feedback:
        selected = profile_calibration

    return {
        **selected,
        "block_reason": block_reason,
        "block_scope": block_scope,
        "session": session_calibration,
        "profile": profile_calibration,
    }


def auto_resolution_feedback_block_reason(calibration: dict[str, Any] | None) -> str:
    payload = calibration or {}
    explicit_reason = str(payload.get("block_reason") or "").strip()
    if explicit_reason:
        return explicit_reason
    cooldown_streak = int(payload.get("cooldown_streak") or AUTO_RESOLUTION_FEEDBACK_COOLDOWN_STREAK)
    min_events = int(payload.get("min_events") or AUTO_RESOLUTION_RELIABILITY_MIN_EVENTS)
    min_reliability = float(payload.get("min_reliability") or AUTO_RESOLUTION_MIN_RELIABILITY)
    if int(payload.get("recent_negative_streak") or 0) >= cooldown_streak:
        return "auto_resolution_feedback_cooldown"
    if (
        int(payload.get("rated_events") or 0) >= min_events
        and float(payload.get("reliability") or 0) < min_reliability
    ):
        return "auto_resolution_low_reliability"
    return ""


def build_profile_learned_resolution_feedback_from_sessions(
    *,
    sessions: list[Any] | tuple[Any, ...],
    user,
    current_session_id: int | None = None,
) -> dict[str, Any]:
    target_profile = user_profile_key(user)
    target_user_id = getattr(user, "id", None)
    blocked_suggestion_ids: dict[str, dict[str, Any]] = {}
    blocked_modules: dict[str, dict[str, Any]] = {}
    events: list[dict[str, Any]] = []
    source_session_ids = set()
    same_user_sessions = set()
    accepted_count = 0
    negative_count = 0
    total_events = 0

    for session in sessions:
        session_id = getattr(session, "id", None)
        if current_session_id is not None and session_id == current_session_id:
            continue
        session_user = getattr(session, "user", None)
        same_user = target_user_id is not None and getattr(session_user, "id", None) == target_user_id
        same_profile = user_profile_key(session_user) == target_profile if session_user is not None else same_user
        if not same_user and not same_profile:
            continue

        feedback = learned_resolution_feedback_from_metadata(getattr(session, "metadata", None))
        if not feedback.get("events") and not int(feedback.get("total_events") or 0):
            continue

        source_session_ids.add(session_id)
        if same_user:
            same_user_sessions.add(session_id)
        total_events += int(feedback.get("total_events") or 0)
        accepted_count += int(feedback.get("accepted_count") or 0)
        negative_count += int(feedback.get("negative_count") or 0)
        _merge_feedback_blocks(blocked_suggestion_ids, feedback.get("blocked_suggestion_ids") or {})
        _merge_feedback_blocks(blocked_modules, feedback.get("blocked_modules") or {})
        for event in feedback.get("events") or []:
            if not isinstance(event, dict):
                continue
            events.append({**event, "source_session_id": session_id})

    return {
        "blocked_suggestion_ids": blocked_suggestion_ids,
        "blocked_modules": blocked_modules,
        "events": events[-80:],
        "total_events": total_events,
        "accepted_count": accepted_count,
        "negative_count": negative_count,
        "scope": {
            "kind": PROFILE_LEARNED_RESOLUTION_FEEDBACK_SCOPE,
            "profile_key": target_profile,
            "groups": user_profile_groups(user),
            "source_session_count": len([item for item in source_session_ids if item is not None]),
            "same_user_session_count": len([item for item in same_user_sessions if item is not None]),
        },
    }


def build_profile_learned_resolution_feedback_snapshot(
    *,
    tenant,
    user,
    current_session=None,
    limit: int = 120,
) -> dict[str, Any]:
    from apps.ai_assistant.models import AiSession

    queryset = (
        AiSession.objects.filter(tenant=tenant, deleted=False)
        .select_related("user")
        .prefetch_related("user__groups")
        .order_by("-updated_at", "-id")[:limit]
    )
    return build_profile_learned_resolution_feedback_from_sessions(
        sessions=list(queryset),
        user=user,
        current_session_id=getattr(current_session, "id", None),
    )


def build_resolution_feedback_repair_options(
    *,
    session_metadata: dict[str, Any] | None = None,
    profile_feedback: dict[str, Any] | None = None,
    selected_module: str = "",
    limit: int = REPAIR_OPTION_LIMIT,
) -> list[dict[str, Any]]:
    selected_module = str(selected_module or "").strip()
    repairs: dict[str, dict[str, Any]] = {}
    _collect_repair_options(
        repairs=repairs,
        feedback=learned_resolution_feedback_from_metadata(session_metadata),
        source="session",
        weight=3,
        selected_module=selected_module,
    )
    _collect_repair_options(
        repairs=repairs,
        feedback=profile_feedback,
        source="profile",
        weight=1,
        selected_module=selected_module,
    )
    ranked = sorted(
        repairs.values(),
        key=lambda item: (
            -int(item.get("score") or 0),
            -int(item.get("session_count") or 0),
            -int(item.get("profile_count") or 0),
            str(item.get("prompt") or ""),
        ),
    )
    return ranked[:limit]


def record_learned_resolution_feedback(
    *,
    session,
    user,
    resolution: dict[str, Any],
    event: str,
    replacement_message: str = "",
    message_id: int | None = None,
) -> dict[str, Any]:
    if event not in VALID_LEARNED_RESOLUTION_FEEDBACK_EVENTS:
        raise ValueError("invalid_learned_resolution_feedback_event")
    if not isinstance(resolution, dict):
        raise ValueError("invalid_learned_resolution_payload")

    selected_option = resolution.get("selected_option") if isinstance(resolution.get("selected_option"), dict) else {}
    selected_module = str(resolution.get("selected_module") or selected_option.get("module") or "").strip()
    option_id = str(selected_option.get("id") or "").strip()
    if selected_option and not option_id:
        option_id = suggestion_key(selected_option)

    feedback_event = "helpful" if event == "accepted" else "not_helpful"
    if selected_option:
        record_proactive_suggestion_feedback(
            session=session,
            user=user,
            suggestion=selected_option,
            event=feedback_event,
            source="learned_resolution",
            message_id=message_id,
        )

    session.refresh_from_db(fields=["metadata"])
    metadata = dict(session.metadata or {})
    feedback = learned_resolution_feedback_from_metadata(metadata)
    blocked_suggestion_ids = dict(feedback["blocked_suggestion_ids"])
    blocked_modules = dict(feedback["blocked_modules"])
    is_negative = event in {"wrong", "corrected", "dismissed"}
    now = datetime.now(UTC).isoformat()

    if is_negative and option_id:
        blocked_suggestion_ids[option_id] = _feedback_block_payload(
            current=blocked_suggestion_ids.get(option_id),
            event=event,
            replacement_message=replacement_message,
            at=now,
        )
    if is_negative and selected_module and not option_id:
        blocked_modules[selected_module] = _feedback_block_payload(
            current=blocked_modules.get(selected_module),
            event=event,
            replacement_message=replacement_message,
            at=now,
        )

    events = list(feedback["events"])
    events.append(
        {
            "event": event,
            "suggestion_id": option_id,
            "module": selected_module,
            "effective_message": str(resolution.get("effective_message") or "")[:500],
            "replacement_message": str(replacement_message or "")[:500],
            "message_id": message_id,
            "user_id": getattr(user, "id", None),
            "at": now,
        }
    )
    updated = {
        "blocked_suggestion_ids": blocked_suggestion_ids,
        "blocked_modules": blocked_modules,
        "events": events[-80:],
        "total_events": int(feedback["total_events"]) + 1,
        "accepted_count": int(feedback["accepted_count"]) + (1 if event == "accepted" else 0),
        "negative_count": int(feedback["negative_count"]) + (1 if is_negative else 0),
    }
    metadata[LEARNED_RESOLUTION_FEEDBACK_KEY] = updated
    session.metadata = metadata
    session.save(update_fields=["metadata", "updated_at"])
    return summarize_learned_resolution_feedback(updated)


def summarize_learned_resolution_feedback(feedback: dict[str, Any] | None) -> dict[str, Any]:
    payload = learned_resolution_feedback_from_metadata({LEARNED_RESOLUTION_FEEDBACK_KEY: feedback or {}})
    event_counts = Counter(str(item.get("event") or "") for item in payload["events"])
    calibration = learned_resolution_reliability_from_feedback(payload)
    return {
        "status": "available",
        "total_events": int(payload["total_events"]),
        "accepted_count": int(payload["accepted_count"]),
        "negative_count": int(payload["negative_count"]),
        "event_counts": dict(sorted(event_counts.items())),
        "blocked_suggestion_ids": payload["blocked_suggestion_ids"],
        "blocked_modules": payload["blocked_modules"],
        "calibration": calibration,
        "scope": payload.get("scope") or {},
    }


def build_phase12_clarification_learning_report() -> dict[str, Any]:
    router = _router()
    billing_learning = _learning_for_focus(
        focus={
            "intent": "financial_review",
            "resources": [{"basename": "billing-invoice", "module": "billing"}],
            "modules": ["billing"],
            "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
        },
        prompt="Mostre faturas pendentes.",
        selected=5,
        helpful=2,
    )
    warehouse_learning = _learning_for_focus(
        focus={
            "intent": "data_exploration",
            "resources": [{"basename": "warehouse-stock_level", "module": "warehouse"}],
            "modules": ["warehouse"],
            "filters": [],
        },
        prompt="Mostre saldos abaixo do ponto de reposicao.",
        selected=5,
        helpful=2,
    )

    short_decision = router.analyze(message="pendentes", active_module="ai")
    learned_short = apply_learning_to_clarification(decision=short_decision, learning=billing_learning, language="pt")
    ambiguous_decision = router.analyze(message="stock", active_module="ai")
    learned_ambiguous = apply_learning_to_clarification(decision=ambiguous_decision, learning=warehouse_learning, language="pt")

    return {
        "phase": 12,
        "title": "Clarificacao adaptativa por aprendizagem do perfil",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "short_input": "pendentes",
            "short_status": "needs_clarification" if learned_short.needs_clarification else "ready",
            "short_first_option": (learned_short.options_pt or ("",))[0],
            "ambiguous_input": "stock",
            "ambiguous_first_option": (learned_ambiguous.options_pt or ("",))[0],
            "module_weights": ((learned_ambiguous.signals or {}).get("clarification_learning") or {}).get("module_weights") or {},
        },
        "priority_findings": [
            "Perguntas de clarificacao passam a reutilizar prompts aprendidos por perfil.",
            "Palavras soltas operacionais, como pendentes, pedem escopo antes de executar ferramenta generica.",
            "Opcoes de modulo em pedidos ambiguos passam a respeitar o perfil aprendido sem ocultar alternativas.",
        ],
    }


def render_phase12_clarification_learning_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Clarificacao Adaptativa Fase 12",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Entrada curta: `{summary['short_input']}`",
        f"- Estado: `{summary['short_status']}`",
        f"- Primeira opcao aprendida: {summary['short_first_option']}",
        f"- Entrada ambigua: `{summary['ambiguous_input']}`",
        f"- Primeiro modulo por aprendizagem: {summary['ambiguous_first_option']}",
        "",
        "## Pesos De Modulo",
        "",
    ]
    lines.extend(f"- `{name}`: {score}" for name, score in summary["module_weights"].items())
    lines.extend(["", "## Achados Prioritarios", ""])
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase12_clarification_learning_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Clarificacao Adaptativa Fase 12",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Entrada curta: {summary['short_input']}",
            f"Estado: {summary['short_status']}",
            f"Primeira opcao aprendida: {summary['short_first_option']}",
            f"Primeiro modulo ambiguo: {summary['ambiguous_first_option']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def build_phase13_learned_resolution_report() -> dict[str, Any]:
    from apps.ai_assistant.services.intent_router import AiIntentRouter
    from apps.ai_assistant.services.registry import AiToolRegistry

    router = AiIntentRouter()
    registry = AiToolRegistry()
    billing_focus = {
        "intent": "financial_review",
        "resources": [{"basename": "billing-invoice", "module": "billing"}],
        "modules": ["billing"],
        "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
    }
    warehouse_focus = {
        "intent": "data_exploration",
        "resources": [{"basename": "warehouse-stock_level", "module": "warehouse"}],
        "modules": ["warehouse"],
        "filters": [],
    }
    safe_learning = _learning_for_focus(
        focus=billing_focus,
        prompt="Mostre faturas pendentes.",
        selected=5,
        helpful=2,
    )
    sensitive_learning = _learning_for_focus(
        focus=billing_focus,
        prompt="Gere um relatorio financeiro desta investigacao.",
        selected=5,
        helpful=2,
    )
    warehouse_learning = _learning_for_focus(
        focus=warehouse_focus,
        prompt="Mostre saldos abaixo do ponto de reposicao.",
        selected=5,
        helpful=2,
    )

    safe_decision = router.analyze(message="pendentes", active_module="ai")
    safe_resolution = resolve_learned_clarification(
        decision=safe_decision,
        learning=safe_learning,
        original_message="pendentes",
    )
    safe_tools = [
        tool.name
        for tool in registry.select_tools(
            message=safe_resolution.effective_message,
            active_module="ai",
            learning=safe_learning,
        )
    ]
    sensitive_resolution = resolve_learned_clarification(
        decision=router.analyze(message="Preciso ver isso", active_module="ai"),
        learning=sensitive_learning,
        original_message="Preciso ver isso",
    )
    module_resolution = resolve_learned_clarification(
        decision=router.analyze(message="stock", active_module="ai"),
        learning=warehouse_learning,
        original_message="stock",
    )

    return {
        "phase": 13,
        "title": "Resolucao automatica segura por aprendizagem",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "safe_resolved": safe_resolution.resolved,
            "safe_effective_message": safe_resolution.effective_message,
            "safe_tools": safe_tools,
            "sensitive_resolved": sensitive_resolution.resolved,
            "sensitive_blocked_reason": sensitive_resolution.blocked_reason,
            "module_resolved": module_resolution.resolved,
            "module_effective_message": module_resolution.effective_message,
            "module_selected": module_resolution.selected_module,
        },
        "priority_findings": [
            "Clarificacoes com opcao aprendida segura podem virar mensagem efectiva sem nova pergunta.",
            "Prompts aprendidos de relatorio, tarefa ou CRUD continuam bloqueados para auto-resolucao.",
            "Recursos ambiguos podem usar modulo dominante do perfil sem remover auditoria da mensagem efectiva.",
        ],
    }


def build_phase14_learned_resolution_feedback_report() -> dict[str, Any]:
    from types import SimpleNamespace

    from apps.ai_assistant.services.intent_router import AiIntentRouter

    router = AiIntentRouter()
    learning = _learning_for_focus(
        focus={
            "intent": "financial_review",
            "resources": [{"basename": "billing-invoice", "module": "billing"}],
            "modules": ["billing"],
            "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
        },
        prompt="Mostre faturas pendentes.",
        selected=5,
        helpful=2,
    )
    session = _FakeResolutionFeedbackSession(metadata={PROACTIVE_GUIDANCE_LEARNING_KEY: learning})
    resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata=session.metadata,
    )
    feedback = record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=1),
        resolution=resolution.as_payload(),
        event="wrong",
        replacement_message="Mostre pendencias de enfermagem.",
        message_id=100,
    )
    blocked_resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning_from_metadata(session.metadata),
        original_message="pendentes",
        session_metadata=session.metadata,
    )
    learning_after = learning_from_metadata(session.metadata)
    option_id = str((resolution.selected_option or {}).get("id") or "")
    option_stats = (learning_after.get("by_suggestion") or {}).get(option_id) or {}
    return {
        "phase": 14,
        "title": "Feedback e travoes para auto-resolucao aprendida",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "initial_resolved": resolution.resolved,
            "feedback_negative_count": feedback["negative_count"],
            "blocked_after_feedback": blocked_resolution.blocked_reason,
            "blocked_suggestions": len(feedback["blocked_suggestion_ids"]),
            "option_negative_count": int(option_stats.get("negative_count") or 0),
            "option_score_after_feedback": int(option_stats.get("score") or 0),
        },
        "priority_findings": [
            "Feedback negativo bloqueia a auto-resolucao exacta na sessao actual.",
            "O mesmo feedback tambem penaliza a sugestao aprendida usada pela resolucao.",
            "Feedback positivo continua a reforcar a opcao sem criar bloqueio.",
        ],
    }


def build_phase15_learned_resolution_calibration_report() -> dict[str, Any]:
    from types import SimpleNamespace

    from apps.ai_assistant.services.intent_router import AiIntentRouter

    router = AiIntentRouter()
    learning = _learning_for_focus(
        focus={
            "intent": "financial_review",
            "resources": [{"basename": "billing-invoice", "module": "billing"}],
            "modules": ["billing"],
            "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
        },
        prompt="Mostre faturas pendentes.",
        selected=5,
        helpful=2,
    )
    session = _FakeResolutionFeedbackSession(metadata={PROACTIVE_GUIDANCE_LEARNING_KEY: learning})
    resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata=session.metadata,
    )
    first_feedback = record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=1),
        resolution=resolution.as_payload(),
        event="wrong",
        replacement_message="Mostre pendencias de enfermagem.",
        message_id=100,
    )
    blocked_after_one = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning_from_metadata(session.metadata),
        original_message="pendentes",
        session_metadata=session.metadata,
    )
    repeated_feedback = record_learned_resolution_feedback(
        session=session,
        user=SimpleNamespace(id=1),
        resolution=resolution.as_payload(),
        event="dismissed",
        replacement_message="",
        message_id=101,
    )
    cooldown_resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning_from_metadata(session.metadata),
        original_message="pendentes",
        session_metadata=session.metadata,
    )
    healthy_session = _FakeResolutionFeedbackSession(metadata={PROACTIVE_GUIDANCE_LEARNING_KEY: learning})
    healthy_resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata=healthy_session.metadata,
    )
    accepted_feedback = record_learned_resolution_feedback(
        session=healthy_session,
        user=SimpleNamespace(id=2),
        resolution=healthy_resolution.as_payload(),
        event="accepted",
        message_id=102,
    )
    still_resolves = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning_from_metadata(healthy_session.metadata),
        original_message="pendentes",
        session_metadata=healthy_session.metadata,
    )

    return {
        "phase": 15,
        "title": "Calibracao de confiabilidade da auto-resolucao aprendida",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "initial_resolved": resolution.resolved,
            "blocked_after_one_negative": blocked_after_one.blocked_reason,
            "cooldown_after_repeated_negative": cooldown_resolution.blocked_reason,
            "negative_reliability": repeated_feedback["calibration"]["reliability"],
            "negative_streak": repeated_feedback["calibration"]["recent_negative_streak"],
            "healthy_reliability": accepted_feedback["calibration"]["reliability"],
            "accepted_still_resolves": still_resolves.resolved,
            "session_guard_status": cooldown_resolution.calibration.get("status") if cooldown_resolution.calibration else "",
            "first_feedback_status": first_feedback["calibration"]["status"],
        },
        "priority_findings": [
            "A auto-resolucao passa a consultar a confiabilidade da sessao antes de executar uma opcao aprendida.",
            "Dois feedbacks negativos recentes colocam a resolucao aprendida em espera e devolvem clarificacao.",
            "Feedback positivo mantem a resolucao automatica disponivel e fica visivel no payload de auditoria.",
        ],
    }


def build_phase16_profile_resolution_calibration_report() -> dict[str, Any]:
    from types import SimpleNamespace

    from apps.ai_assistant.services.intent_router import AiIntentRouter

    router = AiIntentRouter()
    target_user = SimpleNamespace(id=1, groups=["Contabilidade"])
    same_profile_user = SimpleNamespace(id=2, groups=["Contabilidade"])
    other_profile_user = SimpleNamespace(id=3, groups=["Farmacia"])
    learning = _learning_for_focus(
        focus={
            "intent": "financial_review",
            "resources": [{"basename": "billing-invoice", "module": "billing"}],
            "modules": ["billing"],
            "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
        },
        prompt="Mostre faturas pendentes.",
        selected=5,
        helpful=2,
    )
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _fake_feedback_source_session(
                session_id=1,
                user=same_profile_user,
                events=("wrong", "dismissed"),
            ),
            _fake_feedback_source_session(
                session_id=2,
                user=target_user,
                events=("corrected",),
            ),
            _fake_feedback_source_session(
                session_id=3,
                user=other_profile_user,
                events=("accepted", "accepted", "accepted"),
            ),
            _fake_feedback_source_session(
                session_id=99,
                user=target_user,
                events=("accepted",),
            ),
        ],
        user=target_user,
        current_session_id=99,
    )
    blocked_resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
    )
    healthy_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _fake_feedback_source_session(
                session_id=4,
                user=same_profile_user,
                events=("accepted", "accepted", "accepted", "accepted"),
            ),
        ],
        user=target_user,
    )
    healthy_resolution = resolve_learned_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=healthy_feedback,
    )

    return {
        "phase": 16,
        "title": "Calibracao agregada por perfil da auto-resolucao aprendida",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "profile_source_sessions": profile_feedback["scope"]["source_session_count"],
            "same_user_sessions": profile_feedback["scope"]["same_user_session_count"],
            "profile_negative_count": profile_feedback["negative_count"],
            "ignored_other_profile": True,
            "current_session_excluded": True,
            "blocked_by_profile": blocked_resolution.blocked_reason,
            "block_scope": blocked_resolution.calibration.get("block_scope") if blocked_resolution.calibration else "",
            "profile_guard_status": (blocked_resolution.calibration.get("profile") or {}).get("status")
            if blocked_resolution.calibration
            else "",
            "healthy_profile_resolves": healthy_resolution.resolved,
            "healthy_profile_reliability": (healthy_resolution.calibration.get("profile") or {}).get("reliability")
            if healthy_resolution.calibration
            else 0,
        },
        "priority_findings": [
            "Feedback de sessoes anteriores do mesmo perfil passa a calibrar a auto-resolucao.",
            "Rejeicoes repetidas por perfil bloqueiam a execucao automatica antes de tocar nas ferramentas.",
            "Sinais de outros perfis e da sessao actual nao contaminam a calibracao agregada.",
        ],
    }


def build_phase17_resolution_feedback_repair_report() -> dict[str, Any]:
    from types import SimpleNamespace

    from apps.ai_assistant.services.intent_router import AiIntentRouter

    router = AiIntentRouter()
    target_user = SimpleNamespace(id=1, groups=["Contabilidade"])
    same_profile_user = SimpleNamespace(id=2, groups=["Contabilidade"])
    learning = _learning_for_focus(
        focus={
            "intent": "financial_review",
            "resources": [{"basename": "billing-invoice", "module": "billing"}],
            "modules": ["billing"],
            "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
        },
        prompt="Mostre faturas pendentes.",
        selected=5,
        helpful=2,
    )
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _fake_feedback_source_session(
                session_id=1,
                user=same_profile_user,
                events=("wrong", "dismissed"),
                replacement_message="Mostre pendencias de enfermagem.",
            ),
            _fake_feedback_source_session(
                session_id=2,
                user=target_user,
                events=("corrected",),
                replacement_message="Mostre pendencias de enfermagem.",
            ),
        ],
        user=target_user,
    )
    decision = apply_learning_to_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        language="pt",
    )
    blocked_resolution = resolve_learned_clarification(
        decision=decision,
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
    )
    repaired_decision = apply_resolution_feedback_repairs_to_clarification(
        decision=decision,
        session_metadata={},
        profile_feedback=profile_feedback,
        learned_resolution=blocked_resolution,
        language="pt",
    )
    repair_metadata = (repaired_decision.signals or {}).get("resolution_feedback_repair") or {}
    repair_options = repair_metadata.get("repair_options") or []

    return {
        "phase": 17,
        "title": "Reparacao de clarificacao por feedback corrigido",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "blocked_reason": blocked_resolution.blocked_reason,
            "repair_applied": bool(repair_options),
            "first_repair_option": repaired_decision.options_pt[0] if repaired_decision.options_pt else "",
            "repair_option_count": len(repair_options),
            "repair_source": repair_options[0]["source"] if repair_options else "",
            "repair_score": repair_options[0]["score"] if repair_options else 0,
            "question_changed": repaired_decision.question_pt != decision.question_pt,
        },
        "priority_findings": [
            "Mensagens corrigidas em feedback negativo passam a virar opcoes de clarificacao.",
            "Correccoes da sessao actual ganham mais peso, mas o perfil tambem pode recuperar pedidos soltos.",
            "Bloqueios por baixa confiabilidade deixam de terminar em pergunta generica quando ha uma correcao aprendida.",
        ],
    }


def build_phase18_resolution_repair_canonicalization_report() -> dict[str, Any]:
    from types import SimpleNamespace

    from apps.ai_assistant.services.intent_router import AiIntentRouter

    router = AiIntentRouter()
    target_user = SimpleNamespace(id=1, groups=["Contabilidade"])
    same_profile_user = SimpleNamespace(id=2, groups=["Contabilidade"])
    learning = _learning_for_focus(
        focus={
            "intent": "financial_review",
            "resources": [{"basename": "billing-invoice", "module": "billing"}],
            "modules": ["billing"],
            "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
        },
        prompt="Mostre faturas pendentes.",
        selected=5,
        helpful=2,
    )
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _fake_feedback_source_session(
                session_id=1,
                user=same_profile_user,
                events=("wrong",),
                replacement_message="pendencias enfermagem",
            ),
            _fake_feedback_source_session(
                session_id=2,
                user=same_profile_user,
                events=("corrected",),
                replacement_message="Mostre pendencias de enfermagem.",
            ),
            _fake_feedback_source_session(
                session_id=3,
                user=target_user,
                events=("dismissed",),
                replacement_message="Enfermagem pendentes",
            ),
        ],
        user=target_user,
    )
    repair_options = build_resolution_feedback_repair_options(
        session_metadata={},
        profile_feedback=profile_feedback,
        selected_module="billing",
    )
    decision = apply_learning_to_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        language="pt",
    )
    blocked_resolution = resolve_learned_clarification(
        decision=decision,
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
    )
    repaired_decision = apply_resolution_feedback_repairs_to_clarification(
        decision=decision,
        session_metadata={},
        profile_feedback=profile_feedback,
        learned_resolution=blocked_resolution,
        language="pt",
    )
    top_repair = repair_options[0] if repair_options else {}
    return {
        "phase": 18,
        "title": "Canonicalizacao de reparacoes aprendidas",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "variant_inputs": 3,
            "canonical_repair_count": len(repair_options),
            "top_prompt": top_repair.get("prompt") or "",
            "top_signature": top_repair.get("canonical_signature") or "",
            "top_terms": top_repair.get("canonical_terms") or [],
            "top_variant_count": top_repair.get("variant_count") or 0,
            "top_score": top_repair.get("score") or 0,
            "clarification_first_option": repaired_decision.options_pt[0] if repaired_decision.options_pt else "",
            "blocked_reason": blocked_resolution.blocked_reason,
        },
        "priority_findings": [
            "Variacoes curtas da mesma correcao passam a ser agrupadas por assinatura de tokens.",
            "A melhor frase representativa e mantida para mostrar ao utilizador, mesmo quando o pedido veio solto.",
            "Correccoes equivalentes acumulam score em vez de competirem como opcoes duplicadas.",
        ],
    }


def build_phase19_repair_auto_promotion_report() -> dict[str, Any]:
    from types import SimpleNamespace

    from apps.ai_assistant.services.intent_router import AiIntentRouter

    router = AiIntentRouter()
    target_user = SimpleNamespace(id=1, groups=["Contabilidade"])
    same_profile_user = SimpleNamespace(id=2, groups=["Contabilidade"])
    learning = _learning_for_focus(
        focus={
            "intent": "financial_review",
            "resources": [{"basename": "billing-invoice", "module": "billing"}],
            "modules": ["billing"],
            "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
        },
        prompt="Mostre faturas pendentes.",
        selected=5,
        helpful=2,
    )
    profile_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _fake_feedback_source_session(
                session_id=1,
                user=same_profile_user,
                events=("wrong",),
                replacement_message="pendencias enfermagem",
            ),
            _fake_feedback_source_session(
                session_id=2,
                user=same_profile_user,
                events=("corrected",),
                replacement_message="Mostre pendencias de enfermagem.",
            ),
            _fake_feedback_source_session(
                session_id=3,
                user=target_user,
                events=("dismissed",),
                replacement_message="Enfermagem pendentes",
            ),
        ],
        user=target_user,
    )
    decision = apply_learning_to_clarification(
        decision=router.analyze(message="pendentes", active_module="ai"),
        learning=learning,
        language="pt",
    )
    blocked_resolution = resolve_learned_clarification(
        decision=decision,
        learning=learning,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
    )
    promoted_resolution = resolve_repair_auto_promotion(
        decision=decision,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=profile_feedback,
        learned_resolution=blocked_resolution,
    )
    resolved_decision = router.analyze(message=promoted_resolution.effective_message, active_module="ai")
    weak_feedback = build_profile_learned_resolution_feedback_from_sessions(
        sessions=[
            _fake_feedback_source_session(
                session_id=4,
                user=same_profile_user,
                events=("wrong",),
                replacement_message="Mostre pendencias de enfermagem.",
            )
        ],
        user=target_user,
    )
    weak_resolution = resolve_repair_auto_promotion(
        decision=decision,
        original_message="pendentes",
        session_metadata={},
        profile_feedback=weak_feedback,
        learned_resolution=blocked_resolution,
    )

    return {
        "phase": 19,
        "title": "Promocao segura de reparacoes canonicas",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "blocked_reason": blocked_resolution.blocked_reason,
            "promoted": promoted_resolution.resolved,
            "promotion_reason": promoted_resolution.reason,
            "effective_message": promoted_resolution.effective_message,
            "confidence_score": promoted_resolution.confidence_score,
            "selected_signature": (promoted_resolution.selected_option or {}).get("canonical_signature") or "",
            "selected_evidence": _repair_evidence_count(promoted_resolution.selected_option or {}),
            "resolved_needs_clarification": resolved_decision.needs_clarification,
            "weak_evidence_block": weak_resolution.blocked_reason,
        },
        "priority_findings": [
            "Reparacoes canonicas com consenso passam a virar mensagem efectiva automaticamente.",
            "Promocao exige evidencia repetida, dominancia e prompt nao sensivel.",
            "Correccoes fracas continuam como clarificacao, evitando repetir auto-resolucoes incertas.",
        ],
    }


def render_phase14_learned_resolution_feedback_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Feedback Da Resolucao Aprendida Fase 14",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Resolucao inicial aplicada: {summary['initial_resolved']}",
        f"- Feedbacks negativos: {summary['feedback_negative_count']}",
        f"- Bloqueio apos feedback: `{summary['blocked_after_feedback']}`",
        f"- Sugestoes bloqueadas: {summary['blocked_suggestions']}",
        f"- Negativos na sugestao: {summary['option_negative_count']}",
        f"- Score da sugestao apos feedback: {summary['option_score_after_feedback']}",
        "",
        "## Achados Prioritarios",
        "",
    ]
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase14_learned_resolution_feedback_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Feedback Da Resolucao Aprendida Fase 14",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Resolucao inicial aplicada: {summary['initial_resolved']}",
            f"Feedbacks negativos: {summary['feedback_negative_count']}",
            f"Bloqueio apos feedback: {summary['blocked_after_feedback']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def render_phase15_learned_resolution_calibration_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Calibracao Da Resolucao Aprendida Fase 15",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Resolucao inicial aplicada: {summary['initial_resolved']}",
        f"- Bloqueio apos um negativo: `{summary['blocked_after_one_negative']}`",
        f"- Bloqueio apos negativos repetidos: `{summary['cooldown_after_repeated_negative']}`",
        f"- Confiabilidade apos negativos: {summary['negative_reliability']}",
        f"- Sequencia negativa recente: {summary['negative_streak']}",
        f"- Confiabilidade apos aceite: {summary['healthy_reliability']}",
        f"- Resolucao mantida apos aceite: {summary['accepted_still_resolves']}",
        f"- Estado da calibracao: `{summary['session_guard_status']}`",
        "",
        "## Achados Prioritarios",
        "",
    ]
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase15_learned_resolution_calibration_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Calibracao Da Resolucao Aprendida Fase 15",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Resolucao inicial aplicada: {summary['initial_resolved']}",
            f"Bloqueio apos um negativo: {summary['blocked_after_one_negative']}",
            f"Bloqueio apos negativos repetidos: {summary['cooldown_after_repeated_negative']}",
            f"Confiabilidade apos negativos: {summary['negative_reliability']}",
            f"Estado da calibracao: {summary['session_guard_status']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def render_phase16_profile_resolution_calibration_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Calibracao Por Perfil Fase 16",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Sessoes do perfil usadas: {summary['profile_source_sessions']}",
        f"- Sessoes do proprio utilizador: {summary['same_user_sessions']}",
        f"- Feedbacks negativos do perfil: {summary['profile_negative_count']}",
        f"- Outro perfil ignorado: {summary['ignored_other_profile']}",
        f"- Sessao actual excluida da agregacao: {summary['current_session_excluded']}",
        f"- Bloqueio por perfil: `{summary['blocked_by_profile']}`",
        f"- Escopo do bloqueio: `{summary['block_scope']}`",
        f"- Estado do perfil: `{summary['profile_guard_status']}`",
        f"- Perfil saudavel ainda resolve: {summary['healthy_profile_resolves']}",
        f"- Confiabilidade saudavel: {summary['healthy_profile_reliability']}",
        "",
        "## Achados Prioritarios",
        "",
    ]
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase16_profile_resolution_calibration_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Calibracao Por Perfil Fase 16",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Sessoes do perfil usadas: {summary['profile_source_sessions']}",
            f"Feedbacks negativos do perfil: {summary['profile_negative_count']}",
            f"Bloqueio por perfil: {summary['blocked_by_profile']}",
            f"Estado do perfil: {summary['profile_guard_status']}",
            f"Perfil saudavel ainda resolve: {summary['healthy_profile_resolves']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def render_phase17_resolution_feedback_repair_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Reparacao Por Feedback Fase 17",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Bloqueio original: `{summary['blocked_reason']}`",
        f"- Reparacao aplicada: {summary['repair_applied']}",
        f"- Primeira opcao reparada: {summary['first_repair_option']}",
        f"- Opcoes reparadas: {summary['repair_option_count']}",
        f"- Fonte principal: `{summary['repair_source']}`",
        f"- Score da reparacao: {summary['repair_score']}",
        f"- Pergunta ajustada: {summary['question_changed']}",
        "",
        "## Achados Prioritarios",
        "",
    ]
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase17_resolution_feedback_repair_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Reparacao Por Feedback Fase 17",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Bloqueio original: {summary['blocked_reason']}",
            f"Reparacao aplicada: {summary['repair_applied']}",
            f"Primeira opcao reparada: {summary['first_repair_option']}",
            f"Fonte principal: {summary['repair_source']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def render_phase18_resolution_repair_canonicalization_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Canonicalizacao De Reparacoes Fase 18",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Variacoes de entrada: {summary['variant_inputs']}",
        f"- Reparacoes canonicas: {summary['canonical_repair_count']}",
        f"- Prompt principal: {summary['top_prompt']}",
        f"- Assinatura: `{summary['top_signature']}`",
        f"- Termos canonicos: {', '.join(summary['top_terms'])}",
        f"- Variantes agrupadas: {summary['top_variant_count']}",
        f"- Score principal: {summary['top_score']}",
        f"- Primeira opcao de clarificacao: {summary['clarification_first_option']}",
        f"- Bloqueio original: `{summary['blocked_reason']}`",
        "",
        "## Achados Prioritarios",
        "",
    ]
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase18_resolution_repair_canonicalization_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Canonicalizacao De Reparacoes Fase 18",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Variacoes de entrada: {summary['variant_inputs']}",
            f"Reparacoes canonicas: {summary['canonical_repair_count']}",
            f"Prompt principal: {summary['top_prompt']}",
            f"Assinatura: {summary['top_signature']}",
            f"Primeira opcao de clarificacao: {summary['clarification_first_option']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def render_phase19_repair_auto_promotion_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Promocao De Reparacoes Fase 19",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Bloqueio original: `{summary['blocked_reason']}`",
        f"- Reparacao promovida: {summary['promoted']}",
        f"- Motivo da promocao: `{summary['promotion_reason']}`",
        f"- Mensagem efectiva: {summary['effective_message']}",
        f"- Confianca: {summary['confidence_score']}",
        f"- Assinatura seleccionada: `{summary['selected_signature']}`",
        f"- Evidencias seleccionadas: {summary['selected_evidence']}",
        f"- Ainda precisa clarificacao: {summary['resolved_needs_clarification']}",
        f"- Bloqueio com evidencia fraca: `{summary['weak_evidence_block']}`",
        "",
        "## Achados Prioritarios",
        "",
    ]
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase19_repair_auto_promotion_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Promocao De Reparacoes Fase 19",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Bloqueio original: {summary['blocked_reason']}",
            f"Reparacao promovida: {summary['promoted']}",
            f"Mensagem efectiva: {summary['effective_message']}",
            f"Confianca: {summary['confidence_score']}",
            f"Bloqueio com evidencia fraca: {summary['weak_evidence_block']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def render_phase13_learned_resolution_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Resolucao Aprendida Fase 13",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Consulta segura resolvida: {summary['safe_resolved']}",
        f"- Mensagem efectiva segura: {summary['safe_effective_message']}",
        f"- Ferramentas seguras: {', '.join(summary['safe_tools']) or '-'}",
        f"- Prompt sensivel resolvido automaticamente: {summary['sensitive_resolved']}",
        f"- Bloqueio sensivel: `{summary['sensitive_blocked_reason']}`",
        f"- Modulo ambiguo resolvido: {summary['module_resolved']}",
        f"- Mensagem efectiva de modulo: {summary['module_effective_message']}",
        "",
        "## Achados Prioritarios",
        "",
    ]
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase13_learned_resolution_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Resolucao Aprendida Fase 13",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Consulta segura resolvida: {summary['safe_resolved']}",
            f"Mensagem efectiva segura: {summary['safe_effective_message']}",
            f"Prompt sensivel resolvido automaticamente: {summary['sensitive_resolved']}",
            f"Modulo ambiguo resolvido: {summary['module_resolved']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def _router():
    from apps.ai_assistant.services.intent_router import AiIntentRouter

    return AiIntentRouter()


def _learning_for_focus(*, focus: dict[str, Any], prompt: str, selected: int, helpful: int) -> dict[str, Any]:
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
        "scope": {"kind": "tenant_profile", "profile_key": "groups:operacional"},
    }


def _fake_feedback_source_session(*, session_id: int, user, events: tuple[str, ...], replacement_message: str = ""):
    from types import SimpleNamespace

    now = datetime.now(UTC).isoformat()
    rows = [
        {
            "event": event,
            "suggestion_id": "billing_pending",
            "module": "billing",
            "effective_message": "Mostre faturas pendentes.",
            "replacement_message": replacement_message,
            "message_id": session_id * 100 + index,
            "user_id": getattr(user, "id", None),
            "at": now,
        }
        for index, event in enumerate(events, start=1)
    ]
    negative_count = len([event for event in events if event in {"wrong", "corrected", "dismissed"}])
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
                "negative_count": negative_count,
            }
        },
    )


def _feedback_block_payload(
    *,
    current: dict[str, Any] | None,
    event: str,
    replacement_message: str,
    at: str,
) -> dict[str, Any]:
    payload = dict(current or {})
    payload["count"] = int(payload.get("count") or 0) + 1
    payload["last_event"] = event
    payload["last_replacement_message"] = str(replacement_message or "")[:500]
    payload["last_at"] = at
    return payload


def _profile_feedback_block_reason(reason: str) -> str:
    if reason == "auto_resolution_feedback_cooldown":
        return "auto_resolution_profile_feedback_cooldown"
    if reason == "auto_resolution_low_reliability":
        return "auto_resolution_profile_low_reliability"
    return reason


def _merge_feedback_blocks(target: dict[str, dict[str, Any]], source: dict[str, Any]) -> None:
    for key, value in (source or {}).items():
        block_id = str(key or "").strip()
        if not block_id or not isinstance(value, dict):
            continue
        current = dict(target.get(block_id) or {})
        current["count"] = int(current.get("count") or 0) + int(value.get("count") or 1)
        for field in ("last_event", "last_replacement_message", "last_at"):
            if value.get(field):
                current[field] = value[field]
        target[block_id] = current


def _collect_repair_options(
    *,
    repairs: dict[str, dict[str, Any]],
    feedback: dict[str, Any] | None,
    source: str,
    weight: int,
    selected_module: str = "",
) -> None:
    payload = _coerce_learned_resolution_feedback(feedback)
    for event in payload.get("events") or []:
        if not isinstance(event, dict):
            continue
        if str(event.get("event") or "") not in REPAIR_FEEDBACK_EVENTS:
            continue
        module = str(event.get("module") or "").strip()
        if selected_module and module and module != selected_module:
            continue
        _add_repair_option(
            repairs=repairs,
            prompt=str(event.get("replacement_message") or ""),
            source=source,
            weight=weight,
            module=module,
            at=str(event.get("at") or ""),
        )

    for block in [*(payload.get("blocked_suggestion_ids") or {}).values(), *(payload.get("blocked_modules") or {}).values()]:
        if not isinstance(block, dict):
            continue
        _add_repair_option(
            repairs=repairs,
            prompt=str(block.get("last_replacement_message") or ""),
            source=source,
            weight=weight,
            module=selected_module,
            at=str(block.get("last_at") or ""),
        )


def _add_repair_option(
    *,
    repairs: dict[str, dict[str, Any]],
    prompt: str,
    source: str,
    weight: int,
    module: str = "",
    at: str = "",
) -> None:
    prompt = str(prompt or "").strip()
    signature = _repair_signature(prompt)
    if len(signature) < 4:
        return
    current = repairs.setdefault(
        signature,
        {
            "id": suggestion_key({"prompt": prompt, "module": module, "kind": "resolution_feedback_repair"}),
            "prompt": prompt[:500],
            "label": prompt[:180],
            "kind": "resolution_feedback_repair",
            "module": module[:80],
            "source": source,
            "score": 0,
            "session_count": 0,
            "profile_count": 0,
            "canonical_signature": signature,
            "canonical_terms": signature.split(),
            "variant_count": 0,
            "variants": [],
            "prompt_quality": _repair_prompt_quality(prompt),
            "last_at": "",
        },
    )
    current["score"] = int(current.get("score") or 0) + int(weight)
    source_key = "session_count" if source == "session" else "profile_count"
    current[source_key] = int(current.get(source_key) or 0) + 1
    if source == "session":
        current["source"] = "session"
    current_quality = int(current.get("prompt_quality") or 0)
    candidate_quality = _repair_prompt_quality(prompt)
    if candidate_quality > current_quality or (candidate_quality == current_quality and source == "session" and current.get("source") != "session"):
        current["prompt"] = prompt[:500]
        current["label"] = prompt[:180]
        current["id"] = suggestion_key({"prompt": prompt, "module": module, "kind": "resolution_feedback_repair"})
        current["prompt_quality"] = candidate_quality
        if module and not current.get("module"):
            current["module"] = module[:80]
    variants = list(current.get("variants") or [])
    if prompt and prompt not in variants:
        variants.append(prompt[:500])
    current["variants"] = variants[:8]
    current["variant_count"] = len(variants)
    if at and at > str(current.get("last_at") or ""):
        current["last_at"] = at


def _repair_signature(prompt: str) -> str:
    tokens = []
    for token in alias_tokens(prompt):
        normalized = REPAIR_TOKEN_ALIASES.get(token, token)
        if normalized in REPAIR_SIGNATURE_STOPWORDS or len(normalized) <= 2:
            continue
        tokens.append(normalized)
    canonical = sorted(dict.fromkeys(tokens))
    if canonical:
        return " ".join(canonical)
    return normalize_alias_text(prompt)


def _repair_prompt_quality(prompt: str) -> int:
    normalized = normalize_alias_text(prompt)
    tokens = normalized.split()
    if not tokens:
        return 0
    command_bonus = 3 if tokens[0] in {"mostre", "liste", "veja", "mostrar", "listar", "ver"} else 0
    punctuation_bonus = 1 if prompt.strip().endswith((".", "?", "!")) else 0
    return min(20, len(tokens) + command_bonus + punctuation_bonus)


def _coerce_learned_resolution_feedback(feedback: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(feedback, dict):
        return learned_resolution_feedback_from_metadata(None)
    if LEARNED_RESOLUTION_FEEDBACK_KEY in feedback:
        return learned_resolution_feedback_from_metadata(feedback)
    return learned_resolution_feedback_from_metadata({LEARNED_RESOLUTION_FEEDBACK_KEY: feedback})


def _recent_negative_feedback_streak(events: list[Any]) -> int:
    streak = 0
    for item in reversed(events or []):
        if not isinstance(item, dict):
            continue
        event = str(item.get("event") or "")
        if event in {"wrong", "corrected", "dismissed"}:
            streak += 1
            continue
        if event == "accepted":
            break
    return streak


class _FakeResolutionFeedbackSession:
    def __init__(self, *, metadata: dict[str, Any] | None = None) -> None:
        self.metadata = metadata or {}
        self.saved_update_fields: list[str] = []

    def refresh_from_db(self, fields=None):
        self.refreshed_fields = fields

    def save(self, update_fields=None):
        self.saved_update_fields = list(update_fields or [])


def _context_modules(signals: dict[str, Any]) -> set[str]:
    if signals.get("resource_ambiguous"):
        return set()
    if _has_weak_short_operational_match(signals):
        return set()
    modules = {str(item) for item in signals.get("resource_modules") or [] if item}
    active_module = str(signals.get("active_module") or "").strip()
    if active_module and active_module not in {"ai", "ia", "assistant", "ai_assistant"}:
        modules.add(active_module)
    return modules


def _has_weak_short_operational_match(signals: dict[str, Any]) -> bool:
    if not (signals.get("operational") and signals.get("short")):
        return False
    matches = [item for item in signals.get("resource_matches") or [] if isinstance(item, dict)]
    if not matches:
        return False
    best_score = max(int(item.get("score") or 0) for item in matches)
    return best_score < 60


def _module_from_stats(stats: dict[str, Any]) -> str:
    module = str(stats.get("module") or "").strip()
    if module:
        return module
    basename = str(stats.get("resource_basename") or "").strip()
    if "-" in basename:
        return basename.split("-", 1)[0]
    return ""


def _rank_module_options(options: tuple[str, ...], *, module_weights: dict[str, int], language: str) -> list[str]:
    if not module_weights:
        return list(options)
    module_by_label = _module_by_option_label(language=language)
    indexed = list(enumerate(options))
    ranked = sorted(
        indexed,
        key=lambda item: (
            -int(module_weights.get(module_by_label.get(normalize_alias_text(item[1]), ""), 0)),
            item[0],
        ),
    )
    return [item for _, item in ranked]


def _module_by_option_label(*, language: str) -> dict[str, str]:
    source = MODULE_OPTIONS_EN if language == "en" else MODULE_OPTIONS_PT
    values = {normalize_alias_text(label): module for module, label in source.items()}
    values[normalize_alias_text("Armazem/Logistica")] = "warehouse"
    values[normalize_alias_text("Armazém/Logística")] = "warehouse"
    return values


def _merge_options(learned: list[str], existing: tuple[str, ...], *, limit: int) -> list[str]:
    merged = []
    seen = set()
    for value in [*learned, *existing]:
        text = str(value or "").strip()
        key = normalize_alias_text(text)
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(text)
    return merged[:limit]


def _dedupe_option_payloads(options: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    deduped = []
    for option in options:
        key = normalize_alias_text(str(option.get("prompt") or ""))
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(option)
    return deduped


def _dominant_module(module_weights: dict[str, int]) -> tuple[str, int, str]:
    ranked = sorted(
        ((module, int(score or 0)) for module, score in (module_weights or {}).items()),
        key=lambda item: (-item[1], item[0]),
    )
    if not ranked:
        return "", 0, "no_module_weight"
    module, score = ranked[0]
    if score < AUTO_RESOLUTION_MIN_SCORE:
        return "", score, "module_score_below_threshold"
    if len(ranked) > 1 and (score - ranked[1][1]) < AUTO_RESOLUTION_DOMINANCE_MARGIN:
        return "", score, "module_not_dominant"
    return module, score, ""


def _dominant_safe_option(options: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, str]:
    ranked = sorted(options or [], key=lambda item: (-int(item.get("score") or 0), str(item.get("prompt") or "")))
    if not ranked:
        return None, "no_learned_option"
    top = ranked[0]
    top_score = int(top.get("score") or 0)
    if top_score < AUTO_RESOLUTION_MIN_SCORE:
        return None, "option_score_below_threshold"
    if len(ranked) > 1 and (top_score - int(ranked[1].get("score") or 0)) < AUTO_RESOLUTION_DOMINANCE_MARGIN:
        return None, "option_not_dominant"
    if _is_sensitive_option(top):
        return None, "sensitive_option_requires_user_choice"
    return top, ""


def _dominant_repair_promotion_option(options: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, str]:
    ranked = sorted(
        options or [],
        key=lambda item: (
            -int(item.get("score") or 0),
            -_repair_evidence_count(item),
            str(item.get("prompt") or ""),
        ),
    )
    if not ranked:
        return None, "no_repair_option"
    top = ranked[0]
    top_score = int(top.get("score") or 0)
    if top_score < REPAIR_AUTO_PROMOTION_MIN_SCORE:
        return None, "repair_score_below_threshold"
    if _repair_evidence_count(top) < REPAIR_AUTO_PROMOTION_MIN_EVIDENCE:
        return None, "repair_evidence_below_threshold"
    if len(ranked) > 1 and (top_score - int(ranked[1].get("score") or 0)) < REPAIR_AUTO_PROMOTION_DOMINANCE_MARGIN:
        return None, "repair_option_not_dominant"
    if _is_sensitive_repair_option(top):
        return None, "repair_option_sensitive"
    return top, ""


def _blocked_option_from_feedback(options: list[dict[str, Any]], guard: dict[str, Any]) -> dict[str, Any] | None:
    blocked_ids = guard.get("blocked_suggestion_ids") or {}
    if not blocked_ids:
        return None
    for option in options or []:
        option_id = str(option.get("id") or suggestion_key(option))
        if option_id in blocked_ids:
            return option
    return None


def _is_sensitive_option(option: dict[str, Any]) -> bool:
    kind = str(option.get("kind") or "")
    prompt = normalize_alias_text(str(option.get("prompt") or ""))
    if kind not in AUTO_SAFE_KINDS:
        return True
    return any(_has_term(prompt, term) for term in SENSITIVE_AUTO_TERMS)


def _is_sensitive_repair_option(option: dict[str, Any]) -> bool:
    prompt = normalize_alias_text(str(option.get("prompt") or ""))
    return any(_has_term(prompt, term) for term in SENSITIVE_AUTO_TERMS)


def _resolution_confidence(score: int) -> int:
    return min(94, 60 + int(score))


def _repair_evidence_count(option: dict[str, Any]) -> int:
    return int(option.get("session_count") or 0) + int(option.get("profile_count") or 0)


def _repair_promotion_confidence(option: dict[str, Any]) -> int:
    score = int(option.get("score") or 0)
    evidence = _repair_evidence_count(option)
    variants = int(option.get("variant_count") or 0)
    return min(92, 58 + (score * 4) + (evidence * 3) + min(variants, 4))


def _learned_question_pt(decision: IntentDecision) -> str:
    if decision.intent == "underspecified_operational":
        return "Esta pendencia pode pertencer a varios modulos. Quer seguir uma opcao aprendida pelo seu perfil?"
    return "Encontrei opcoes frequentes para o seu perfil. Quer seguir uma delas ou detalhar outro modulo?"


def _learned_question_en(decision: IntentDecision) -> str:
    if decision.intent == "underspecified_operational":
        return "This pending item may belong to several modules. Do you want one option learned from your profile?"
    return "I found frequent options for your profile. Do you want one of them or another module?"


def _repair_question_pt(block_reason: str) -> str:
    if block_reason:
        return "A auto-resolucao aprendida perdeu confiabilidade. Quer seguir uma correcao aprendida ou escolher outra opcao?"
    return "Encontrei correccoes anteriores para pedidos parecidos. Quer seguir uma delas?"


def _repair_question_en(block_reason: str) -> str:
    if block_reason:
        return "The learned auto-resolution lost reliability. Do you want a learned correction or another option?"
    return "I found previous corrections for similar requests. Do you want to use one of them?"


def _score(stats: dict[str, Any]) -> int:
    try:
        selected = float(stats.get("selected_count") or 0)
        positive = float(stats.get("positive_count") or 0)
        negative = float(stats.get("negative_count") or 0)
        explicit = float(stats.get("score") or 0)
    except (TypeError, ValueError):
        return 0
    calculated = selected * 2 + positive * 3 - negative * 3
    return round(calculated or explicit)


def _has_term(normalized: str, raw_term: str) -> bool:
    term = normalize_alias_text(raw_term)
    if not term:
        return False
    return term in normalized
