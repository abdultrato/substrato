from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from apps.ai_assistant.services.clarification_learning import learned_resolution_reliability_from_feedback


def build_understanding_trace(
    *,
    original_message: str,
    effective_message: str,
    active_module: str = "",
    language: str = "pt",
    status: str,
    intent_decision,
    followup_resolution: dict[str, Any] | None = None,
    learned_resolution: dict[str, Any] | None = None,
    profile_learning: dict[str, Any] | None = None,
    profile_resolution_feedback: dict[str, Any] | None = None,
    selected_tools: list[Any] | tuple[Any, ...] | None = None,
    blocked_tools: list[dict[str, Any]] | None = None,
    tool_results: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    decision_payload = intent_decision.as_payload(language=language) if hasattr(intent_decision, "as_payload") else dict(intent_decision or {})
    signals = getattr(intent_decision, "signals", None)
    if signals is None and isinstance(intent_decision, dict):
        signals = intent_decision.get("signals")
    signals = signals if isinstance(signals, dict) else {}
    followup_payload = followup_resolution or {}
    learned_payload = learned_resolution or {}
    profile_learning_payload = profile_learning or {}
    profile_feedback_payload = profile_resolution_feedback or {}
    profile_feedback_summary = learned_resolution_reliability_from_feedback(
        profile_feedback_payload,
        min_reliability=0.5,
        min_events=4,
        cooldown_streak=3,
    )
    tool_payload = [_tool_payload(tool) for tool in selected_tools or []]

    decision_path = _decision_path(
        original_message=original_message,
        effective_message=effective_message,
        status=status,
        decision_payload=decision_payload,
        signals=signals,
        followup_payload=followup_payload,
        learned_payload=learned_payload,
        tool_payload=tool_payload,
        blocked_tools=blocked_tools or [],
    )
    trace = {
        "status": "available",
        "phase": 20,
        "generated_at": datetime.now(UTC).isoformat(),
        "language": "en" if language == "en" else "pt",
        "active_module": str(active_module or ""),
        "original_message": str(original_message or ""),
        "effective_message": str(effective_message or original_message or ""),
        "message_changed": str(original_message or "").strip() != str(effective_message or original_message or "").strip(),
        "conversation_status": status,
        "intent": decision_payload.get("intent") or "",
        "confidence_score": int(decision_payload.get("confidence_score") or 0),
        "needs_clarification": bool(decision_payload.get("status") == "needs_clarification"),
        "loose_input": _is_loose_input(signals),
        "decision_path": decision_path,
        "learning": {
            "profile_scope": profile_learning_payload.get("scope") if isinstance(profile_learning_payload.get("scope"), dict) else {},
            "profile_suggestion_count": len(profile_learning_payload.get("by_suggestion") or {}),
            "profile_resolution_feedback": {
                "scope": profile_feedback_payload.get("scope") if isinstance(profile_feedback_payload.get("scope"), dict) else {},
                "reliability": profile_feedback_summary["reliability"],
                "rated_events": profile_feedback_summary["rated_events"],
                "status": profile_feedback_summary["status"],
            },
        },
        "safety": {
            "learned_resolution_resolved": bool(learned_payload.get("resolved")),
            "learned_resolution_reason": str(learned_payload.get("reason") or ""),
            "learned_resolution_blocked_reason": str(learned_payload.get("blocked_reason") or ""),
            "confidence_score": int(learned_payload.get("confidence_score") or 0),
            "blocked_tools": blocked_tools or [],
        },
        "selected_tools": tool_payload,
        "tool_result_count": len(tool_results or []),
    }
    trace["summary_pt"] = _summary(trace, language="pt")
    trace["summary_en"] = _summary(trace, language="en")
    return trace


def build_phase20_understanding_trace_report() -> dict[str, Any]:
    trace = build_understanding_trace(
        original_message="pendentes",
        effective_message="Mostre pendencias de enfermagem.",
        active_module="ai",
        language="pt",
        status="answered",
        intent_decision={
            "status": "answered",
            "intent": "operational_status",
            "confidence_score": 82,
            "signals": {"short": True, "operational": True},
        },
        followup_resolution={"resolved": False, "reason": "no_previous_focus"},
        learned_resolution={
            "resolved": True,
            "reason": "dominant_canonical_feedback_repair",
            "effective_message": "Mostre pendencias de enfermagem.",
            "confidence_score": 82,
            "selected_option": {
                "canonical_signature": "enfermagem pendencia",
                "score": 3,
                "variant_count": 3,
            },
        },
        profile_learning={"by_suggestion": {"billing_pending": {"score": 17}}, "scope": {"kind": "tenant_profile"}},
        profile_resolution_feedback={
            "events": [{"event": "wrong"}, {"event": "corrected"}, {"event": "dismissed"}],
            "accepted_count": 0,
            "negative_count": 3,
            "total_events": 3,
            "scope": {"kind": "tenant_profile_resolution_feedback", "source_session_count": 2},
        },
        selected_tools=[{"name": "nursing_pending_work", "mode": "read"}],
        blocked_tools=[],
        tool_results=[{"tool_name": "nursing_pending_work"}],
    )
    return {
        "phase": 20,
        "title": "Trilha auditavel de entendimento da IA",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "trace_status": trace["status"],
            "loose_input": trace["loose_input"],
            "message_changed": trace["message_changed"],
            "decision_steps": len(trace["decision_path"]),
            "learning_reason": trace["safety"]["learned_resolution_reason"],
            "selected_tool_count": len(trace["selected_tools"]),
            "summary_pt": trace["summary_pt"],
        },
        "trace": trace,
        "priority_findings": [
            "Cada resposta passa a expor a mensagem original, a mensagem efectiva e a decisao tomada.",
            "Promocoes por aprendizagem ficam rastreaveis por motivo, confianca e escopo de perfil.",
            "Entradas curtas deixam de ser caixas-pretas: a API mostra se houve reparacao, clarificacao ou ferramenta.",
        ],
    }


def render_phase20_understanding_trace_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    trace = report["trace"]
    lines = [
        "# IA Operacional - Trilha De Entendimento Fase 20",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Estado da trilha: `{summary['trace_status']}`",
        f"- Entrada curta/solta: {summary['loose_input']}",
        f"- Mensagem alterada: {summary['message_changed']}",
        f"- Passos de decisao: {summary['decision_steps']}",
        f"- Motivo aprendido: `{summary['learning_reason']}`",
        f"- Ferramentas seleccionadas: {summary['selected_tool_count']}",
        f"- Resumo: {summary['summary_pt']}",
        "",
        "## Caminho De Decisao",
        "",
    ]
    lines.extend(f"- `{step['stage']}`: {step['detail']}" for step in trace["decision_path"])
    lines.extend(["", "## Achados Prioritarios", ""])
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase20_understanding_trace_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Trilha De Entendimento Fase 20",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Entrada curta/solta: {summary['loose_input']}",
            f"Mensagem alterada: {summary['message_changed']}",
            f"Motivo aprendido: {summary['learning_reason']}",
            f"Resumo: {summary['summary_pt']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def _decision_path(
    *,
    original_message: str,
    effective_message: str,
    status: str,
    decision_payload: dict[str, Any],
    signals: dict[str, Any],
    followup_payload: dict[str, Any],
    learned_payload: dict[str, Any],
    tool_payload: list[dict[str, Any]],
    blocked_tools: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    steps = [
        {
            "stage": "input",
            "status": "received",
            "detail": f"Entrada recebida: {str(original_message or '').strip()[:160]}",
        },
        {
            "stage": "intent_router",
            "status": decision_payload.get("status") or status,
            "detail": f"Intent `{decision_payload.get('intent') or ''}` com confianca {int(decision_payload.get('confidence_score') or 0)}.",
        },
    ]
    if followup_payload.get("resolved"):
        steps.append(
            {
                "stage": "conversation_memory",
                "status": "resolved",
                "detail": f"Contexto anterior aplicado: {followup_payload.get('reason') or 'conversation_focus'}.",
            }
        )
    if learned_payload:
        if learned_payload.get("resolved"):
            steps.append(
                {
                    "stage": "learned_resolution",
                    "status": "resolved",
                    "detail": f"Mensagem efectiva aprendida: {str(learned_payload.get('effective_message') or effective_message)[:160]}.",
                }
            )
        elif learned_payload.get("blocked_reason"):
            steps.append(
                {
                    "stage": "learned_resolution",
                    "status": "blocked",
                    "detail": f"Auto-resolucao bloqueada por `{learned_payload.get('blocked_reason')}`.",
                }
            )
    if status == "needs_clarification":
        steps.append(
            {
                "stage": "clarification",
                "status": "needs_user_choice",
                "detail": "A IA pediu clarificacao antes de executar ferramentas.",
            }
        )
    elif tool_payload:
        steps.append(
            {
                "stage": "tool_selection",
                "status": "selected",
                "detail": f"{len(tool_payload)} ferramenta(s) seleccionada(s): {', '.join(item['name'] for item in tool_payload[:4])}.",
            }
        )
    if blocked_tools:
        steps.append(
            {
                "stage": "policy",
                "status": "blocked",
                "detail": f"{len(blocked_tools)} ferramenta(s) bloqueada(s) por politica.",
            }
        )
    if _is_loose_input(signals):
        steps.append(
            {
                "stage": "loose_input",
                "status": "detected",
                "detail": "Entrada curta ou operacional detectada e tratada com aprendizagem/contexto.",
            }
        )
    return steps


def _tool_payload(tool: Any) -> dict[str, Any]:
    if isinstance(tool, dict):
        return {
            "name": str(tool.get("name") or tool.get("tool_name") or ""),
            "mode": str(tool.get("mode") or ""),
        }
    return {
        "name": str(getattr(tool, "name", "") or ""),
        "mode": str(getattr(tool, "mode", "") or ""),
    }


def _is_loose_input(signals: dict[str, Any]) -> bool:
    return bool(
        signals.get("short")
        or signals.get("ambiguous_reference")
        or signals.get("resource_ambiguous")
        or (signals.get("operational") and not signals.get("resource_count"))
    )


def _summary(trace: dict[str, Any], *, language: str) -> str:
    effective = trace.get("effective_message") or trace.get("original_message") or ""
    reason = (trace.get("safety") or {}).get("learned_resolution_reason") or ""
    if language == "en":
        if reason:
            return f"Understood as `{effective}` using `{reason}`."
        return f"Understood as `{effective}` with intent `{trace.get('intent') or ''}`."
    if reason:
        return f"Entendido como `{effective}` usando `{reason}`."
    return f"Entendido como `{effective}` com intencao `{trace.get('intent') or ''}`."
