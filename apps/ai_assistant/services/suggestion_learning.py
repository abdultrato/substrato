from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any

from apps.ai_assistant.services.alias_normalization import normalize_alias_text

PROACTIVE_GUIDANCE_LEARNING_KEY = "proactive_guidance_learning"
VALID_PROACTIVE_FEEDBACK_EVENTS = ("selected", "helpful", "not_helpful", "dismissed")
PROFILE_LEARNING_SCOPE = "tenant_profile"


def suggestion_key(suggestion: dict[str, Any] | str | None) -> str:
    if isinstance(suggestion, str):
        raw = suggestion
    else:
        payload = suggestion or {}
        explicit = str(payload.get("id") or "").strip()
        if explicit:
            raw = explicit
        else:
            raw = "|".join(
                str(payload.get(key) or "").strip()
                for key in ("module", "resource_basename", "kind", "reason", "prompt", "label")
                if str(payload.get(key) or "").strip()
            )
    normalized = normalize_alias_text(raw).replace(" ", "_")
    return normalized[:160] or "suggestion"


def learning_from_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    value = (metadata or {}).get(PROACTIVE_GUIDANCE_LEARNING_KEY)
    if not isinstance(value, dict):
        return {"by_suggestion": {}, "events": [], "total_events": 0}
    by_suggestion = value.get("by_suggestion") if isinstance(value.get("by_suggestion"), dict) else {}
    events = value.get("events") if isinstance(value.get("events"), list) else []
    return {
        "by_suggestion": by_suggestion,
        "events": events[-80:],
        "total_events": int(value.get("total_events") or len(events)),
        "scope": value.get("scope") if isinstance(value.get("scope"), dict) else {},
    }


def apply_learning_to_suggestions(
    *,
    suggestions: list[dict[str, Any]],
    learning: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    learning_payload = learning_from_metadata({PROACTIVE_GUIDANCE_LEARNING_KEY: learning or {}})
    enriched = [_enrich_suggestion(suggestion=suggestion, learning=learning_payload) for suggestion in suggestions]
    return sorted(enriched, key=lambda item: (-int((item.get("learning") or {}).get("score") or 0), item.get("_order", 0)))


def user_profile_key(user) -> str:
    groups = user_profile_groups(user)
    if getattr(user, "is_superuser", False):
        groups = ["superuser", *groups]
    if getattr(user, "is_staff", False):
        groups = ["staff", *groups]
    return "groups:" + ",".join(dict.fromkeys(groups)) if groups else "groups:none"


def user_profile_groups(user) -> list[str]:
    groups_attr = getattr(user, "groups", None)
    if groups_attr is None:
        raw_groups = getattr(user, "group_names", []) or []
    elif hasattr(groups_attr, "all"):
        raw_groups = groups_attr.all()
    elif isinstance(groups_attr, (list, tuple, set)):
        raw_groups = groups_attr
    else:
        raw_groups = []
    names = []
    for group in raw_groups:
        name = str(getattr(group, "name", group) or "").strip()
        normalized = normalize_alias_text(name)
        if normalized:
            names.append(normalized)
    return sorted(dict.fromkeys(names))


def build_profile_learning_from_sessions(
    *,
    sessions: list[Any] | tuple[Any, ...],
    user,
    current_session_id: int | None = None,
) -> dict[str, Any]:
    target_profile = user_profile_key(user)
    target_user_id = getattr(user, "id", None)
    by_suggestion: dict[str, dict[str, Any]] = {}
    source_session_ids = set()
    same_user_sessions = set()
    total_events = 0

    for session in sessions:
        session_user = getattr(session, "user", None)
        same_user = target_user_id is not None and getattr(session_user, "id", None) == target_user_id
        same_profile = user_profile_key(session_user) == target_profile if session_user is not None else same_user
        if not same_user and not same_profile:
            continue

        learning = learning_from_metadata(getattr(session, "metadata", None))
        if not learning.get("by_suggestion"):
            continue
        session_id = getattr(session, "id", None)
        source_session_ids.add(session_id)
        if same_user:
            same_user_sessions.add(session_id)
        total_events += int(learning.get("total_events") or 0)
        weight = _session_learning_weight(session=session, same_user=same_user, current_session_id=current_session_id)
        for key, stats in (learning.get("by_suggestion") or {}).items():
            if not isinstance(stats, dict):
                continue
            current = by_suggestion.setdefault(str(key), _empty_aggregate_stats(key=str(key), stats=stats))
            current["selected_count"] = _number(current.get("selected_count")) + (_number(stats.get("selected_count")) * weight)
            current["positive_count"] = _number(current.get("positive_count")) + (_number(stats.get("positive_count")) * weight)
            current["negative_count"] = _number(current.get("negative_count")) + (_number(stats.get("negative_count")) * weight)
            current["source_session_count"] = int(current.get("source_session_count") or 0) + 1
            current["last_at"] = str(stats.get("last_at") or current.get("last_at") or "")
            current["score"] = _score(current)

    scope = {
        "kind": PROFILE_LEARNING_SCOPE,
        "profile_key": target_profile,
        "groups": user_profile_groups(user),
        "source_session_count": len([item for item in source_session_ids if item is not None]),
        "same_user_session_count": len([item for item in same_user_sessions if item is not None]),
    }
    return {
        "by_suggestion": by_suggestion,
        "events": [],
        "total_events": total_events,
        "scope": scope,
    }


def build_profile_learning_snapshot(
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
    return build_profile_learning_from_sessions(
        sessions=list(queryset),
        user=user,
        current_session_id=getattr(current_session, "id", None),
    )


def record_proactive_suggestion_feedback(
    *,
    session,
    user,
    suggestion: dict[str, Any] | str,
    event: str,
    source: str = "",
    message_id: int | None = None,
) -> dict[str, Any]:
    if event not in VALID_PROACTIVE_FEEDBACK_EVENTS:
        raise ValueError("invalid_feedback_event")

    payload = _suggestion_payload(suggestion)
    key = suggestion_key(payload)
    now = datetime.now(UTC).isoformat()

    session.refresh_from_db(fields=["metadata"])
    metadata = dict(session.metadata or {})
    learning = learning_from_metadata(metadata)
    by_suggestion = dict(learning.get("by_suggestion") or {})
    stats = dict(by_suggestion.get(key) or {})

    stats["id"] = key
    stats["prompt"] = str(payload.get("prompt") or payload.get("label") or "")[:500]
    stats["label"] = str(payload.get("label") or "")[:180]
    stats["kind"] = str(payload.get("kind") or "")[:80]
    stats["module"] = str(payload.get("module") or "")[:80]
    stats["resource_basename"] = str(payload.get("resource_basename") or "")[:160]
    stats["selected_count"] = int(stats.get("selected_count") or 0) + (1 if event == "selected" else 0)
    stats["positive_count"] = int(stats.get("positive_count") or 0) + (1 if event == "helpful" else 0)
    stats["negative_count"] = int(stats.get("negative_count") or 0) + (1 if event in {"not_helpful", "dismissed"} else 0)
    stats["last_event"] = event
    stats["last_source"] = str(source or "")[:80]
    stats["last_message_id"] = message_id
    stats["last_at"] = now
    stats["score"] = _score(stats)
    by_suggestion[key] = stats

    events = list(learning.get("events") or [])
    events.append(
        {
            "id": key,
            "event": event,
            "source": str(source or "")[:80],
            "message_id": message_id,
            "user_id": getattr(user, "id", None),
            "prompt": stats["prompt"],
            "at": now,
        }
    )

    updated = {
        "by_suggestion": by_suggestion,
        "events": events[-80:],
        "total_events": int(learning.get("total_events") or 0) + 1,
    }
    metadata[PROACTIVE_GUIDANCE_LEARNING_KEY] = updated
    session.metadata = metadata
    session.save(update_fields=["metadata", "updated_at"])
    return summarize_learning(updated, selected_key=key)


def summarize_learning(learning: dict[str, Any] | None, *, selected_key: str = "") -> dict[str, Any]:
    payload = learning_from_metadata({PROACTIVE_GUIDANCE_LEARNING_KEY: learning or {}})
    rows = list((payload.get("by_suggestion") or {}).values())
    rows = sorted(rows, key=lambda item: (-int(item.get("score") or 0), str(item.get("prompt") or "")))
    event_counts = Counter(str(item.get("event") or "") for item in payload.get("events") or [])
    return {
        "status": "recorded" if selected_key else "available",
        "selected_key": selected_key,
        "total_events": int(payload.get("total_events") or 0),
        "event_counts": dict(sorted(event_counts.items())),
        "top_suggestions": rows[:6],
        "scope": payload.get("scope") or {},
    }


def build_phase10_profile_learning_report() -> dict[str, Any]:
    from types import SimpleNamespace

    from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance

    user = SimpleNamespace(id=1, groups=["Contabilidade"])
    same_profile_user = SimpleNamespace(id=2, groups=["Contabilidade"])
    other_profile_user = SimpleNamespace(id=3, groups=["Farmácia"])
    focus = {
        "intent": "financial_review",
        "resources": [{"basename": "billing-invoice", "module": "billing"}],
        "modules": ["billing"],
        "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
    }
    baseline = build_proactive_guidance(conversation_focus=focus, language="pt")
    learned_target = next(
        item for item in baseline["suggestions"] if item["prompt"] == "Gere um relatorio financeiro desta investigacao."
    )
    learned_key = suggestion_key(learned_target)
    sessions = [
        _fake_learning_session(
            session_id=1,
            user=user,
            key=learned_key,
            prompt=learned_target["prompt"],
            selected_count=1,
            positive_count=1,
        ),
        _fake_learning_session(
            session_id=2,
            user=same_profile_user,
            key=learned_key,
            prompt=learned_target["prompt"],
            selected_count=4,
            positive_count=2,
        ),
        _fake_learning_session(
            session_id=3,
            user=other_profile_user,
            key=suggestion_key(baseline["suggestions"][0]),
            prompt=baseline["suggestions"][0]["prompt"],
            selected_count=10,
            positive_count=10,
        ),
    ]
    profile_learning = build_profile_learning_from_sessions(sessions=sessions, user=user, current_session_id=1)
    learned = build_proactive_guidance(conversation_focus=focus, language="pt", learning=profile_learning)
    return {
        "phase": 10,
        "title": "Aprendizagem agregada por tenant e perfil",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "baseline_first_prompt": baseline["suggestions"][0]["prompt"],
            "profile_first_prompt": learned["suggestions"][0]["prompt"],
            "profile_key": profile_learning["scope"]["profile_key"],
            "source_session_count": profile_learning["scope"]["source_session_count"],
            "same_user_session_count": profile_learning["scope"]["same_user_session_count"],
            "ignored_other_profile": True,
        },
        "priority_findings": [
            "A IA passa a reutilizar aprendizagem de sessoes anteriores do mesmo perfil dentro do tenant.",
            "Sinais de outros perfis do mesmo tenant nao reordenam as sugestoes do utilizador actual.",
            "A fase 11 deve aplicar estes pesos tambem na seleccao de ferramentas e nao apenas na ordem das sugestoes.",
        ],
    }


def render_phase10_profile_learning_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Aprendizagem por Perfil Fase 10",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Primeira sugestao sem aprendizagem: {summary['baseline_first_prompt']}",
        f"- Primeira sugestao por perfil: {summary['profile_first_prompt']}",
        f"- Perfil: `{summary['profile_key']}`",
        f"- Sessoes agregadas: {summary['source_session_count']}",
        f"- Sessoes do proprio utilizador: {summary['same_user_session_count']}",
        f"- Outro perfil ignorado: {summary['ignored_other_profile']}",
        "",
        "## Achados Prioritarios",
        "",
    ]
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase10_profile_learning_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Aprendizagem por Perfil Fase 10",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Primeira sugestao sem aprendizagem: {summary['baseline_first_prompt']}",
            f"Primeira sugestao por perfil: {summary['profile_first_prompt']}",
            f"Perfil: {summary['profile_key']}",
            f"Sessoes agregadas: {summary['source_session_count']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def build_phase9_suggestion_learning_report() -> dict[str, Any]:
    from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance

    focus = {
        "intent": "financial_review",
        "resources": [{"basename": "billing-invoice", "module": "billing"}],
        "modules": ["billing"],
        "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
    }
    baseline = build_proactive_guidance(conversation_focus=focus, language="pt")
    learned_target = next(
        item for item in baseline["suggestions"] if item["prompt"] == "Gere um relatorio financeiro desta investigacao."
    )
    learned_key = suggestion_key(learned_target)
    learning = {
        "by_suggestion": {
            learned_key: {
                "id": learned_key,
                "prompt": learned_target["prompt"],
                "selected_count": 4,
                "positive_count": 2,
                "negative_count": 0,
                "score": 14,
            }
        },
        "events": [{"id": learned_key, "event": "selected"} for _ in range(4)],
        "total_events": 4,
    }
    learned = build_proactive_guidance(conversation_focus=focus, language="pt", learning=learning)
    return {
        "phase": 9,
        "title": "Seleccao visual e aprendizagem por uso das sugestoes",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "baseline_first_prompt": baseline["suggestions"][0]["prompt"],
            "learned_first_prompt": learned["suggestions"][0]["prompt"],
            "learning_events": learning["total_events"],
            "learned_key": learned_key,
        },
        "priority_findings": [
            "Sugestoes passam a ter identificador estavel para telemetria de uso.",
            "Seleccoes e feedback reordenam sugestoes futuras dentro da sessao.",
            "A fase 10 deve promover estes sinais para aprendizagem agregada por tenant e perfil.",
        ],
    }


def render_phase9_suggestion_learning_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Aprendizagem de Sugestoes Fase 9",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Primeira sugestao sem aprendizagem: {summary['baseline_first_prompt']}",
        f"- Primeira sugestao com aprendizagem: {summary['learned_first_prompt']}",
        f"- Eventos simulados: {summary['learning_events']}",
        f"- Chave aprendida: `{summary['learned_key']}`",
        "",
        "## Achados Prioritarios",
        "",
    ]
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase9_suggestion_learning_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Aprendizagem de Sugestoes Fase 9",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Primeira sugestao sem aprendizagem: {summary['baseline_first_prompt']}",
            f"Primeira sugestao com aprendizagem: {summary['learned_first_prompt']}",
            f"Eventos simulados: {summary['learning_events']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def _enrich_suggestion(*, suggestion: dict[str, Any], learning: dict[str, Any]) -> dict[str, Any]:
    key = suggestion_key(suggestion)
    stats = ((learning.get("by_suggestion") or {}).get(key) or {}) if isinstance(learning, dict) else {}
    scope = stats.get("scope") or (learning.get("scope") or {}).get("kind") or "session"
    return {
        **suggestion,
        "id": key,
        "learning": {
            "selected_count": round(_number(stats.get("selected_count"))),
            "positive_count": round(_number(stats.get("positive_count"))),
            "negative_count": round(_number(stats.get("negative_count"))),
            "score": _score(stats),
            "scope": scope,
        },
    }


def _score(stats: dict[str, Any]) -> int:
    has_count_fields = any(key in stats for key in ("selected_count", "positive_count", "negative_count"))
    if has_count_fields:
        return round(
            _number(stats.get("selected_count")) * 2
            + _number(stats.get("positive_count")) * 3
            - _number(stats.get("negative_count")) * 3
        )
    explicit = _number(stats.get("score"))
    if explicit:
        return round(explicit)
    return 0


def _suggestion_payload(suggestion: dict[str, Any] | str) -> dict[str, Any]:
    if isinstance(suggestion, dict):
        return dict(suggestion)
    return {"prompt": str(suggestion or "")}


def _session_learning_weight(*, session, same_user: bool, current_session_id: int | None) -> float:
    if current_session_id is not None and getattr(session, "id", None) == current_session_id:
        return 1.35
    if same_user:
        return 1.15
    return 1.0


def _empty_aggregate_stats(*, key: str, stats: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": key,
        "prompt": str(stats.get("prompt") or "")[:500],
        "label": str(stats.get("label") or "")[:180],
        "kind": str(stats.get("kind") or "")[:80],
        "module": str(stats.get("module") or "")[:80],
        "resource_basename": str(stats.get("resource_basename") or "")[:160],
        "selected_count": 0.0,
        "positive_count": 0.0,
        "negative_count": 0.0,
        "source_session_count": 0,
        "score": 0,
        "scope": PROFILE_LEARNING_SCOPE,
    }


def _number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _fake_learning_session(
    *,
    session_id: int,
    user,
    key: str,
    prompt: str,
    selected_count: int,
    positive_count: int,
):
    from types import SimpleNamespace

    stats = {
        "id": key,
        "prompt": prompt,
        "selected_count": selected_count,
        "positive_count": positive_count,
        "negative_count": 0,
    }
    stats["score"] = _score(stats)
    return SimpleNamespace(
        id=session_id,
        user=user,
        metadata={
            PROACTIVE_GUIDANCE_LEARNING_KEY: {
                "by_suggestion": {key: stats},
                "events": [{"id": key, "event": "selected"} for _ in range(selected_count)],
                "total_events": selected_count + positive_count,
            }
        },
    )
