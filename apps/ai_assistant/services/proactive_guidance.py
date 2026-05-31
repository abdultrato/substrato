from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from apps.ai_assistant.services.alias_normalization import normalize_alias_text
from apps.ai_assistant.services.suggestion_learning import apply_learning_to_suggestions, suggestion_key

PHASE8_PROBES = (
    {
        "name": "planos dentarios",
        "language": "pt",
        "conversation_focus": {
            "intent": "data_exploration",
            "resources": [
                {
                    "basename": "dental-patient_treatment_plan",
                    "module": "dental",
                    "label_pt": "Planos dentarios por paciente",
                    "label_en": "Dental patient treatment plans",
                }
            ],
            "modules": ["dental"],
            "filters": [{"basename": "dental-patient_treatment_plan", "kind": "domain_validity"}],
        },
    },
    {
        "name": "stock farmacia",
        "language": "pt",
        "conversation_focus": {
            "intent": "pharmacy_stock",
            "resources": [
                {
                    "basename": "pharmacy-lot",
                    "module": "pharmacy",
                    "label_pt": "Lotes de farmacia",
                    "label_en": "Pharmacy lots",
                }
            ],
            "modules": ["pharmacy"],
            "filters": [{"basename": "pharmacy-lot", "kind": "semantic_expiration"}],
        },
    },
    {
        "name": "faturas",
        "language": "pt",
        "conversation_focus": {
            "intent": "financial_review",
            "resources": [
                {
                    "basename": "billing-invoice",
                    "module": "billing",
                    "label_pt": "Faturas",
                    "label_en": "Invoices",
                }
            ],
            "modules": ["billing"],
            "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
        },
    },
    {
        "name": "wms",
        "language": "pt",
        "conversation_focus": {
            "intent": "data_exploration",
            "resources": [
                {
                    "basename": "warehouse-stock_level",
                    "module": "warehouse",
                    "label_pt": "Saldos de estoque",
                    "label_en": "Stock levels",
                }
            ],
            "modules": ["warehouse"],
            "filters": [],
        },
    },
    {
        "name": "monitoramento",
        "language": "pt",
        "conversation_focus": {
            "intent": "operational_health",
            "resources": [
                {
                    "basename": "monitoring-error",
                    "module": "monitoring",
                    "label_pt": "Erros e falhas do sistema",
                    "label_en": "System errors and failures",
                }
            ],
            "modules": ["monitoring"],
            "filters": [],
        },
    },
    {"name": "sem foco", "language": "pt", "conversation_focus": {}},
)


@dataclass(frozen=True, slots=True)
class ProactiveSuggestion:
    kind: str
    priority: str
    label_pt: str
    label_en: str
    prompt_pt: str
    prompt_en: str
    reason: str
    resource_basename: str = ""
    module: str = ""

    def as_payload(self, *, language: str = "pt") -> dict[str, Any]:
        label = self.label_en if language == "en" else self.label_pt
        prompt = self.prompt_en if language == "en" else self.prompt_pt
        payload = {
            "kind": self.kind,
            "priority": self.priority,
            "label": label,
            "prompt": prompt,
            "reason": self.reason,
            "resource_basename": self.resource_basename,
            "module": self.module,
        }
        return {"id": suggestion_key(payload), **payload}


def build_proactive_guidance(
    *,
    conversation_focus: dict[str, Any] | None,
    tool_results: list[dict[str, Any]] | None = None,
    investigation: dict[str, Any] | None = None,
    language: str = "pt",
    limit: int = 6,
    learning: dict[str, Any] | None = None,
) -> dict[str, Any]:
    focus = conversation_focus or {}
    language = "en" if language == "en" else "pt"
    resources = _resources(focus)
    modules = _modules(focus=focus, resources=resources)
    filters = [item for item in focus.get("filters") or [] if isinstance(item, dict)]
    tool_names = _tool_names(focus=focus, tool_results=tool_results or [], investigation=investigation)
    intent = str((investigation or {}).get("intent") or focus.get("intent") or "")

    suggestions: list[ProactiveSuggestion] = []
    for resource in resources:
        suggestions.extend(_resource_suggestions(resource))
    suggestions.extend(_filter_suggestions(filters=filters, resources=resources))
    suggestions.extend(_module_suggestions(modules=modules, tool_names=tool_names, intent=intent))
    suggestions.extend(_generic_suggestions(intent=intent, has_focus=bool(resources or modules)))

    deduped = _dedupe(suggestions)[:limit]
    suggestion_payloads = apply_learning_to_suggestions(
        suggestions=[item.as_payload(language=language) for item in deduped],
        learning=learning,
    )
    return {
        "status": "available" if deduped else "empty",
        "suggestions": suggestion_payloads,
        "recommended_questions": [
            item["prompt"]
            for item in suggestion_payloads
            if item.get("kind") in {"question", "filter", "report", "task"}
        ][:limit],
        "context": {
            "intent": intent,
            "modules": sorted(modules),
            "resources": [item.get("basename") for item in resources if item.get("basename")],
            "filters": [item.get("kind") for item in filters if item.get("kind")],
            "tool_names": tool_names,
        },
    }


def build_phase8_proactive_guidance_report() -> dict[str, Any]:
    probes = []
    for probe in PHASE8_PROBES:
        guidance = build_proactive_guidance(
            conversation_focus=dict(probe["conversation_focus"]),
            language=str(probe["language"]),
        )
        probes.append(
            {
                "name": probe["name"],
                "status": guidance["status"],
                "suggestion_count": len(guidance["suggestions"]),
                "recommended_questions": guidance["recommended_questions"],
                "kinds": [item["kind"] for item in guidance["suggestions"]],
                "modules": guidance["context"]["modules"],
                "resources": guidance["context"]["resources"],
            }
        )
    kind_counts = Counter(kind for probe in probes for kind in probe["kinds"])
    return {
        "phase": 8,
        "title": "Sugestoes proactivas e perguntas recomendadas por contexto",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "probes": len(probes),
            "with_suggestions": sum(1 for probe in probes if probe["suggestion_count"] > 0),
            "total_suggestions": sum(probe["suggestion_count"] for probe in probes),
            "kind_counts": dict(sorted(kind_counts.items())),
        },
        "probes": probes,
        "priority_findings": _phase8_findings(probes),
    }


def render_phase8_proactive_guidance_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Sugestoes Proactivas Fase 8",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Probes analisados: {summary['probes']}",
        f"- Probes com sugestoes: {summary['with_suggestions']}",
        f"- Sugestoes geradas: {summary['total_suggestions']}",
        "",
        "## Tipos",
        "",
    ]
    lines.extend(f"- `{kind}`: {count}" for kind, count in summary["kind_counts"].items())
    lines.extend(
        [
            "",
            "## Probes",
            "",
            "| Contexto | Recursos | Tipos | Perguntas recomendadas |",
            "| --- | --- | --- | --- |",
        ]
    )
    for probe in report["probes"]:
        resources = ", ".join(probe["resources"]) or "-"
        kinds = ", ".join(probe["kinds"]) or "-"
        questions = "<br>".join(probe["recommended_questions"][:3]) or "-"
        lines.append(f"| `{probe['name']}` | {resources} | {kinds} | {questions} |")

    lines.extend(["", "## Achados Prioritarios", ""])
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase8_proactive_guidance_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Sugestoes Proactivas Fase 8",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Probes analisados: {summary['probes']}",
            f"Probes com sugestoes: {summary['with_suggestions']}",
            f"Sugestoes geradas: {summary['total_suggestions']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def merge_recommended_questions(
    *,
    existing: list[str] | tuple[str, ...] | None,
    proactive_guidance: dict[str, Any] | None,
    limit: int = 8,
) -> list[str]:
    values = [str(item) for item in (proactive_guidance or {}).get("recommended_questions") or [] if str(item).strip()]
    values.extend(str(item) for item in existing or [] if str(item).strip())
    seen = set()
    merged = []
    for value in values:
        key = normalize_alias_text(value)
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(value)
    return merged[:limit]


def _resources(focus: dict[str, Any]) -> list[dict[str, Any]]:
    return [item for item in focus.get("resources") or [] if isinstance(item, dict) and item.get("basename")]


def _modules(*, focus: dict[str, Any], resources: list[dict[str, Any]]) -> set[str]:
    modules = {str(item) for item in focus.get("modules") or [] if item}
    for resource in resources:
        module = str(resource.get("module") or "")
        basename = str(resource.get("basename") or "")
        if not module and "-" in basename:
            module = basename.split("-", 1)[0]
        if module:
            modules.add(module)
    return modules


def _tool_names(
    *,
    focus: dict[str, Any],
    tool_results: list[dict[str, Any]],
    investigation: dict[str, Any] | None,
) -> list[str]:
    values = [str(item) for item in focus.get("tool_names") or [] if item]
    values.extend(str(item.get("tool_name") or "") for item in tool_results if item.get("tool_name"))
    values.extend(str(item) for item in (investigation or {}).get("tool_names") or [] if item)
    return list(dict.fromkeys(item for item in values if item))


def _resource_suggestions(resource: dict[str, Any]) -> list[ProactiveSuggestion]:
    basename = str(resource.get("basename") or "")
    module = str(resource.get("module") or "") or (basename.split("-", 1)[0] if "-" in basename else "")
    if basename == "dental-patient_treatment_plan":
        return [
            _suggest("filter", "high", "Pacientes com plano valido", "Patients with valid plan", "Mostre pacientes com plano dentario valido.", "Show patients with a valid dental plan.", "dental_plan_validity", basename, module),
            _suggest("filter", "high", "Pacientes com plano expirado", "Patients with expired plan", "Mostre pacientes com plano dentario expirado.", "Show patients with an expired dental plan.", "dental_plan_validity", basename, module),
            _suggest("question", "normal", "Itens do plano dentario", "Dental plan items", "Mostre os itens associados ao plano dentario.", "Show the items associated with the dental plan.", "related_resource", basename, module),
        ]
    if basename.startswith("pharmacy-") or module == "pharmacy":
        return [
            _suggest("filter", "high", "Lotes expirados", "Expired lots", "Mostre lotes de farmacia expirados.", "Show expired pharmacy lots.", "pharmacy_expiration", basename, module),
            _suggest("filter", "normal", "Validade proxima", "Near expiry", "Mostre lotes que vencem nos proximos 30 dias.", "Show lots expiring in the next 30 days.", "pharmacy_expiration", basename, module),
            _suggest("question", "normal", "Stock historico", "Historical stock", "Qual era o stock de medicacao ontem?", "What was medication stock yesterday?", "pharmacy_stock_history", basename, module),
        ]
    if basename == "billing-invoice" or module in {"billing", "payments"}:
        return [
            _suggest("filter", "high", "Faturas pendentes", "Pending invoices", "Mostre faturas pendentes.", "Show pending invoices.", "billing_pending", basename, module),
            _suggest("filter", "normal", "Faturas pagas", "Paid invoices", "Mostre faturas pagas este mes.", "Show invoices paid this month.", "billing_paid", basename, module),
            _suggest("report", "normal", "Relatorio financeiro", "Financial report", "Gere um relatorio financeiro desta investigacao.", "Generate a financial report from this investigation.", "financial_report", basename, module),
        ]
    if basename.startswith("warehouse-") or module == "warehouse":
        return [
            _suggest("filter", "high", "Reposicao", "Replenishment", "Mostre saldos abaixo do ponto de reposicao.", "Show balances below reorder point.", "warehouse_replenishment", basename, module),
            _suggest("question", "normal", "Reservas", "Reservations", "Mostre reservas de stock pendentes.", "Show pending stock reservations.", "warehouse_reservations", basename, module),
            _suggest("report", "normal", "Relatorio WMS", "WMS report", "Gere um relatorio de stock e reposicao.", "Generate a stock and replenishment report.", "warehouse_report", basename, module),
        ]
    if basename == "monitoring-error" or module == "monitoring":
        return [
            _suggest("filter", "high", "Erros 500", "500 errors", "Mostre erros 500 das ultimas 24 horas.", "Show 500 errors from the last 24 hours.", "monitoring_5xx", basename, module),
            _suggest("task", "high", "Tarefa operacional", "Operational task", "Crie uma tarefa para investigar estes erros.", "Create a task to investigate these errors.", "monitoring_task", basename, module),
        ]
    if module == "human_resources":
        return [
            _suggest("filter", "normal", "Funcionarios activos", "Active employees", "Mostre funcionarios activos.", "Show active employees.", "hr_active", basename, module),
            _suggest("filter", "normal", "Ferias", "Vacations", "Mostre funcionarios em ferias.", "Show employees on vacation.", "hr_vacations", basename, module),
        ]
    if module == "consultations":
        return [
            _suggest("filter", "normal", "Consultas hoje", "Today's appointments", "Mostre consultas de hoje.", "Show today's appointments.", "consultations_today", basename, module),
            _suggest("filter", "normal", "Consultas abertas", "Open appointments", "Mostre consultas abertas.", "Show open appointments.", "consultations_open", basename, module),
        ]
    return []


def _filter_suggestions(*, filters: list[dict[str, Any]], resources: list[dict[str, Any]]) -> list[ProactiveSuggestion]:
    basename = str(resources[0].get("basename") or "") if resources else ""
    module = str(resources[0].get("module") or "") if resources else ""
    suggestions = []
    for item in filters:
        kind = str(item.get("kind") or "")
        if kind in {"semantic_expiration", "domain_validity"}:
            suggestions.append(
                _suggest("filter", "normal", "Alternar validade", "Toggle validity", "Compare validos e expirados neste recurso.", "Compare valid and expired records for this resource.", "filter_alternative", basename, module)
            )
        if kind == "domain_pending_status":
            suggestions.append(
                _suggest("filter", "normal", "Estados fechados", "Closed statuses", "Compare pendentes com pagos ou concluidos.", "Compare pending records with paid or completed ones.", "filter_alternative", basename, module)
            )
        if kind == "date_range":
            suggestions.append(
                _suggest("question", "normal", "Comparar periodo", "Compare period", "Compare este resultado com o periodo anterior.", "Compare this result with the previous period.", "period_comparison", basename, module)
            )
    return suggestions


def _module_suggestions(*, modules: set[str], tool_names: list[str], intent: str) -> list[ProactiveSuggestion]:
    suggestions = []
    if "explore_database" in tool_names or intent == "data_exploration":
        suggestions.append(
            _suggest("report", "normal", "Relatorio", "Report", "Gere um relatorio desta investigacao.", "Generate a report from this investigation.", "data_report")
        )
    if "monitoring" in modules or intent == "operational_health":
        suggestions.append(
            _suggest("task", "high", "Criar tarefa", "Create task", "Crie uma tarefa operacional para dar seguimento.", "Create an operational follow-up task.", "operational_task", module="monitoring")
        )
    return suggestions


def _generic_suggestions(*, intent: str, has_focus: bool) -> list[ProactiveSuggestion]:
    if has_focus:
        return [
            _suggest("question", "low", "Refinar", "Refine", "Refine com periodo, estado ou codigo especifico.", "Refine with a period, status or specific code.", "refine_focus")
        ]
    return [
        _suggest("question", "normal", "Escolher modulo", "Choose module", "Indique o modulo e o periodo que devo investigar.", "Specify the module and period I should investigate.", "no_focus"),
        _suggest("question", "low", "Exemplos", "Examples", "Mostre exemplos de perguntas que posso fazer.", "Show examples of questions I can ask.", "no_focus"),
    ]


def _suggest(
    kind: str,
    priority: str,
    label_pt: str,
    label_en: str,
    prompt_pt: str,
    prompt_en: str,
    reason: str,
    resource_basename: str = "",
    module: str = "",
) -> ProactiveSuggestion:
    return ProactiveSuggestion(
        kind=kind,
        priority=priority,
        label_pt=label_pt,
        label_en=label_en,
        prompt_pt=prompt_pt,
        prompt_en=prompt_en,
        reason=reason,
        resource_basename=resource_basename,
        module=module,
    )


def _dedupe(suggestions: list[ProactiveSuggestion]) -> list[ProactiveSuggestion]:
    priority_rank = {"high": 0, "normal": 1, "low": 2}
    suggestions = sorted(suggestions, key=lambda item: (priority_rank.get(item.priority, 9), item.kind, item.prompt_pt))
    seen = set()
    deduped = []
    for item in suggestions:
        key = normalize_alias_text(item.prompt_pt)
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def _phase8_findings(probes: list[dict[str, Any]]) -> list[str]:
    findings = [
        "A IA passa a devolver perguntas recomendadas baseadas no recurso e nos filtros em foco.",
        "As sugestoes proactivas sao prompts seguros, nao acoes gravadas nem execucoes sem confirmacao.",
    ]
    without = [probe["name"] for probe in probes if probe["suggestion_count"] == 0]
    if without:
        findings.append("Contextos sem sugestoes suficientes: " + ", ".join(without) + ".")
    findings.append("A fase 9 deve transformar estas sugestoes em seleccao visual e aprendizagem por uso.")
    return findings
