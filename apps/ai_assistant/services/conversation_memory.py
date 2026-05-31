from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime
import re
from typing import Any

from apps.ai_assistant.services.alias_normalization import normalize_alias_text
from apps.ai_assistant.services.resource_disambiguation import GENERIC_ACTIVE_MODULES, resolve_module_key

CLARIFICATION_METADATA_KEY = "intent_clarification"
CONVERSATION_FOCUS_KEY = "conversation_focus"

AFFIRMATIVE_TERMS = {"sim", "yes", "ok", "certo", "confirmo", "isso", "esse", "essa"}

FOLLOWUP_TERMS = (
    "isso",
    "isto",
    "aquilo",
    "mostre",
    "mostrar",
    "liste",
    "listar",
    "ver",
    "agora",
    "tambem",
    "também",
    "e os",
    "e as",
    "validos",
    "válidos",
    "valido",
    "válido",
    "expirados",
    "expiradas",
    "expirado",
    "expirada",
    "vencidos",
    "vencidas",
    "pendentes",
    "pendente",
    "abertos",
    "abertas",
    "hoje",
    "ontem",
    "este mes",
    "mês",
)

MODULE_REPLY_ALIASES: dict[str, tuple[str, ...]] = {
    "pharmacy": ("farmacia", "farmácia", "pharmacy", "medicamentos", "medicacao", "medicação"),
    "warehouse": ("armazem", "armazém", "warehouse", "wms", "logistica", "logística", "inventario", "inventário"),
    "bloodbank": ("banco de sangue", "sangue", "hemoterapia", "blood bank"),
    "billing": ("faturamento", "facturacao", "facturação", "fatura", "factura", "billing"),
    "payments": ("pagamentos", "pagamento", "recibos", "payment", "payments"),
    "dental": ("odontologia", "dentario", "dentário", "dentaria", "dentária", "dente"),
}

PHASE7_PROBES = (
    {
        "input": "Farmácia",
        "active_module": "ai",
        "session_metadata": {
            CLARIFICATION_METADATA_KEY: {
                "status": "needs_clarification",
                "intent": "ambiguous_resource",
                "reason": "generic_stock_without_module_context",
                "signals": {"normalized": "stock"},
            }
        },
    },
    {
        "input": "Armazém",
        "active_module": "ai",
        "session_metadata": {
            CLARIFICATION_METADATA_KEY: {
                "status": "needs_clarification",
                "intent": "ambiguous_resource",
                "reason": "generic_stock_without_module_context",
                "signals": {"normalized": "stock"},
            }
        },
    },
    {
        "input": "e os expirados?",
        "active_module": "ai",
        "session_metadata": {
            CONVERSATION_FOCUS_KEY: {
                "intent": "data_exploration",
                "resources": [
                    {
                        "basename": "dental-patient_treatment_plan",
                        "label_pt": "Planos dentários por paciente",
                    }
                ],
            }
        },
    },
    {
        "input": "mostrar isso",
        "active_module": "ai",
        "session_metadata": {
            CONVERSATION_FOCUS_KEY: {
                "intent": "pharmacy_stock",
                "resources": [{"basename": "pharmacy-lot", "label_pt": "Lotes de farmácia"}],
            }
        },
    },
    {
        "input": "pendentes",
        "active_module": "ai",
        "session_metadata": {
            CONVERSATION_FOCUS_KEY: {
                "intent": "financial_review",
                "resources": [{"basename": "billing-invoice", "label_pt": "Faturas"}],
            }
        },
    },
    {"input": "expirados", "active_module": "ai", "session_metadata": {}},
)


@dataclass(frozen=True, slots=True)
class ConversationFollowupResolution:
    original_message: str
    effective_message: str
    resolved: bool = False
    reason: str = ""
    selected_module: str = ""
    focus_resources: tuple[str, ...] = ()
    pending_intent: str = ""

    def as_payload(self) -> dict[str, Any]:
        return {
            "original_message": self.original_message,
            "effective_message": self.effective_message,
            "resolved": self.resolved,
            "reason": self.reason,
            "selected_module": self.selected_module,
            "focus_resources": list(self.focus_resources),
            "pending_intent": self.pending_intent,
        }


def resolve_conversation_followup(
    *,
    message: str,
    active_module: str = "",
    session_metadata: dict[str, Any] | None = None,
) -> ConversationFollowupResolution:
    raw = message or ""
    normalized = normalize_alias_text(raw)
    session_metadata = session_metadata or {}
    pending = session_metadata.get(CLARIFICATION_METADATA_KEY) if isinstance(session_metadata, dict) else {}
    focus = session_metadata.get(CONVERSATION_FOCUS_KEY) if isinstance(session_metadata, dict) else {}
    focus_resources = _focus_resource_basenames(focus)

    selected_module = _module_from_reply(normalized=normalized, active_module=active_module)
    if isinstance(pending, dict) and pending.get("status") == "needs_clarification":
        pending_intent = str(pending.get("intent") or "")
        if pending_intent == "ambiguous_resource" and selected_module:
            original = _pending_original_message(pending)
            if original:
                return ConversationFollowupResolution(
                    original_message=raw,
                    effective_message=f"{original} {selected_module}".strip(),
                    resolved=True,
                    reason="pending_ambiguous_resource_module_reply",
                    selected_module=selected_module,
                    focus_resources=focus_resources,
                    pending_intent=pending_intent,
                )

    if focus_resources and _is_focus_followup(normalized):
        resource_context = " ".join(focus_resources[:3])
        return ConversationFollowupResolution(
            original_message=raw,
            effective_message=f"{resource_context} {raw}".strip(),
            resolved=True,
            reason="conversation_focus_followup",
            selected_module=selected_module,
            focus_resources=focus_resources,
            pending_intent=str(pending.get("intent") or "") if isinstance(pending, dict) else "",
        )

    return ConversationFollowupResolution(
        original_message=raw,
        effective_message=raw,
        resolved=False,
        selected_module=selected_module,
        focus_resources=focus_resources,
        pending_intent=str(pending.get("intent") or "") if isinstance(pending, dict) else "",
    )


def build_conversation_focus_payload(
    *,
    intent_decision,
    tool_results: list[dict[str, Any]],
    investigation: dict[str, Any] | None,
    original_message: str,
    effective_message: str,
    tool_names: list[str] | None = None,
    updated_at: str = "",
) -> dict[str, Any]:
    resources = _resources_from_tool_results(tool_results)
    resources = _merge_resources(resources, _resources_from_intent_signals(getattr(intent_decision, "signals", None) or {}))
    modules = _modules_from_resources(resources)
    signals = getattr(intent_decision, "signals", None) or {}
    modules.update(str(module) for module in signals.get("resource_modules") or [] if module)
    filters = _filters_from_tool_results(tool_results)
    tool_names = tool_names or [str(item.get("tool_name") or "") for item in tool_results if item.get("tool_name")]
    return {
        "intent": (investigation or {}).get("intent") or getattr(intent_decision, "intent", ""),
        "confidence_score": getattr(intent_decision, "confidence_score", 0),
        "tool_names": list(dict.fromkeys(tool_names)),
        "resources": resources[:8],
        "modules": sorted(modules),
        "filters": filters[:12],
        "last_user_message": original_message or "",
        "effective_message": effective_message or original_message or "",
        "last_normalized_message": normalize_alias_text(effective_message or original_message or ""),
        "resource_disambiguation": signals.get("resource_disambiguation") or {},
        "updated_at": updated_at,
    }


def build_phase7_conversation_memory_report() -> dict[str, Any]:
    from apps.ai_assistant.services.intent_router import AiIntentRouter
    from apps.ai_assistant.services.registry import AiToolRegistry

    router = AiIntentRouter()
    registry = AiToolRegistry()
    probes = []
    for probe in PHASE7_PROBES:
        message = str(probe["input"])
        active_module = str(probe["active_module"])
        session_metadata = dict(probe["session_metadata"])
        resolution = resolve_conversation_followup(
            message=message,
            active_module=active_module,
            session_metadata=session_metadata,
        )
        if not resolution.resolved and not (resolution.focus_resources or resolution.pending_intent):
            probes.append(
                {
                    "input": message,
                    "effective_message": resolution.effective_message,
                    "resolved": False,
                    "reason": "",
                    "status": "needs_clarification",
                    "intent": "underspecified",
                    "resource_basenames": [],
                    "resource_modules": [],
                    "selected_tools": [],
                }
            )
            continue

        decision = router.analyze(
            message=resolution.effective_message,
            active_module=active_module,
            session_metadata=session_metadata,
        )
        selected_tools = registry.select_tools(
            message=resolution.effective_message,
            active_module=active_module,
            session_metadata=session_metadata,
        )
        signals = decision.signals or {}
        probes.append(
            {
                "input": message,
                "effective_message": resolution.effective_message,
                "resolved": resolution.resolved,
                "reason": resolution.reason,
                "status": "needs_clarification" if decision.needs_clarification else "ready",
                "intent": decision.intent,
                "resource_basenames": signals.get("resource_basenames") or [],
                "resource_modules": signals.get("resource_modules") or [],
                "selected_tools": [tool.name for tool in selected_tools],
            }
        )

    return {
        "phase": 7,
        "title": "Memoria conversacional para follow-ups e clarificacoes",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "probes": len(probes),
            "resolved_followups": sum(1 for probe in probes if probe["resolved"]),
            "ready": sum(1 for probe in probes if probe["status"] == "ready"),
            "needs_clarification": sum(1 for probe in probes if probe["status"] == "needs_clarification"),
            "tools_selected": dict(sorted(Counter(tool for probe in probes for tool in probe["selected_tools"]).items())),
        },
        "probes": probes,
        "priority_findings": _phase7_findings(probes),
    }


def render_phase7_conversation_memory_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Memoria Conversacional Fase 7",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Probes analisados: {summary['probes']}",
        f"- Follow-ups resolvidos: {summary['resolved_followups']}",
        f"- Prontos sem clarificacao: {summary['ready']}",
        f"- Com clarificacao: {summary['needs_clarification']}",
        "",
        "## Ferramentas Seleccionadas",
        "",
    ]
    lines.extend(f"- `{tool}`: {count}" for tool, count in summary["tools_selected"].items())
    lines.extend(
        [
            "",
            "## Probes",
            "",
            "| Entrada | Mensagem efectiva | Estado | Motivo | Recursos | Ferramentas |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    for probe in report["probes"]:
        resources = ", ".join(probe["resource_basenames"][:5]) or "-"
        tools = ", ".join(probe["selected_tools"]) or "-"
        reason = probe["reason"] or "-"
        lines.append(
            f"| `{probe['input']}` | `{probe['effective_message']}` | {probe['status']} | "
            f"{reason} | {resources} | {tools} |"
        )

    lines.extend(["", "## Achados Prioritarios", ""])
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase7_conversation_memory_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Memoria Conversacional Fase 7",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Probes analisados: {summary['probes']}",
            f"Follow-ups resolvidos: {summary['resolved_followups']}",
            f"Prontos sem clarificacao: {summary['ready']}",
            f"Com clarificacao: {summary['needs_clarification']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def _pending_original_message(pending: dict[str, Any]) -> str:
    explicit = str(pending.get("original_message") or "").strip()
    if explicit:
        return explicit
    signals = pending.get("signals") if isinstance(pending.get("signals"), dict) else {}
    normalized = str(signals.get("normalized") or "").strip()
    if normalized:
        return normalized
    matches = signals.get("resource_matches") if isinstance(signals, dict) else []
    if isinstance(matches, list):
        for match in matches:
            if not isinstance(match, dict):
                continue
            terms = match.get("matched_terms") if isinstance(match.get("matched_terms"), list) else []
            if terms:
                return str(terms[0])
    return ""


def _module_from_reply(*, normalized: str, active_module: str = "") -> str:
    active_module_key = resolve_module_key(active_module)
    if normalized in AFFIRMATIVE_TERMS and active_module_key and active_module_key not in GENERIC_ACTIVE_MODULES:
        return active_module_key
    exact = resolve_module_key(normalized)
    if exact and exact not in GENERIC_ACTIVE_MODULES:
        return exact
    for module, aliases in MODULE_REPLY_ALIASES.items():
        if any(_has_term(normalized, alias) for alias in aliases):
            return module
    return ""


def _is_focus_followup(normalized: str) -> bool:
    if not normalized:
        return False
    if any(_has_term(normalized, term) for term in FOLLOWUP_TERMS):
        return True
    return len(normalized.split()) <= 3


def _focus_resource_basenames(focus: Any) -> tuple[str, ...]:
    if not isinstance(focus, dict):
        return ()
    basenames = []
    for item in focus.get("resources") or []:
        if not isinstance(item, dict):
            continue
        basename = str(item.get("basename") or "").strip()
        if basename:
            basenames.append(basename)
    return tuple(dict.fromkeys(basenames))


def _resources_from_tool_results(tool_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    resources = []
    for item in tool_results:
        result = item.get("result") or {}
        for key in ("resource_results", "denied_resources", "catalog"):
            values = result.get(key) or (result.get("summary") or {}).get(key) or []
            if not isinstance(values, list):
                continue
            for value in values:
                if not isinstance(value, dict):
                    continue
                resource = _resource_payload(value)
                if resource:
                    resources.append(resource)
    return _merge_resources([], resources)


def _resources_from_intent_signals(signals: dict[str, Any]) -> list[dict[str, Any]]:
    resources = []
    for item in signals.get("resource_matches") or []:
        if not isinstance(item, dict):
            continue
        resource = _resource_payload(item)
        if resource:
            resources.append(resource)
    return _merge_resources([], resources)


def _resource_payload(value: dict[str, Any]) -> dict[str, Any] | None:
    basename = str(value.get("basename") or "").strip()
    if not basename:
        return None
    module = str(value.get("module") or "").strip()
    if not module and "-" in basename:
        module = basename.split("-", 1)[0]
    return {
        "basename": basename,
        "module": module,
        "label_pt": str(value.get("label_pt") or value.get("label") or ""),
        "label_en": str(value.get("label_en") or value.get("label") or ""),
        "href": str(value.get("href") or ""),
    }


def _merge_resources(left: list[dict[str, Any]], right: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged = []
    seen = set()
    for value in [*left, *right]:
        basename = str(value.get("basename") or "")
        if not basename or basename in seen:
            continue
        seen.add(basename)
        merged.append(value)
    return merged


def _modules_from_resources(resources: list[dict[str, Any]]) -> set[str]:
    modules = set()
    for resource in resources:
        module = str(resource.get("module") or "").strip()
        if not module and "-" in str(resource.get("basename") or ""):
            module = str(resource["basename"]).split("-", 1)[0]
        if module:
            modules.add(module)
    return modules


def _filters_from_tool_results(tool_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    filters = []
    for item in tool_results:
        result = item.get("result") or {}
        for resource in result.get("resource_results") or (result.get("summary") or {}).get("resource_results") or []:
            if not isinstance(resource, dict):
                continue
            for applied in resource.get("applied_filters") or []:
                if not isinstance(applied, dict):
                    continue
                filters.append({"basename": resource.get("basename") or "", **applied})
    return filters


def _has_term(normalized: str, raw_term: str) -> bool:
    term = normalize_alias_text(raw_term)
    if not term:
        return False
    return bool(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized))


def _phase7_findings(probes: list[dict[str, Any]]) -> list[str]:
    findings = [
        "Respostas curtas a clarificacoes passam a recuperar a pergunta original antes de seleccionar ferramentas.",
        "Follow-ups com foco anterior passam a carregar os recursos anteriores para a nova mensagem efectiva.",
    ]
    unresolved = [probe["input"] for probe in probes if not probe["resolved"] and probe["status"] != "ready"]
    if unresolved:
        findings.append("Entradas sem memoria suficiente continuam a pedir clarificacao: " + ", ".join(unresolved) + ".")
    resolved = [f"{probe['input']} -> {probe['effective_message']}" for probe in probes if probe["resolved"]]
    if resolved:
        findings.append("Expansoes auditadas: " + "; ".join(resolved[:5]) + ".")
    findings.append("A fase 8 deve ligar estes estados de memoria a sugestoes proactivas e perguntas recomendadas.")
    return findings
