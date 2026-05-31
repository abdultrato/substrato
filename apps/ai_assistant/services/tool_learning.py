from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
import re
from typing import Any

from apps.ai_assistant.services.alias_normalization import normalize_alias_text
from apps.ai_assistant.services.suggestion_learning import learning_from_metadata
from apps.ai_assistant.tools.clinical import ClinicalOperationalSummaryTool, LabRequestCollectionGuidanceTool
from apps.ai_assistant.tools.command_center import CommandCenterAlertsTool
from apps.ai_assistant.tools.data_explorer import ExploreDatabaseTool
from apps.ai_assistant.tools.education import EducationSummaryTool
from apps.ai_assistant.tools.finance import FinancialOperationalSummaryTool
from apps.ai_assistant.tools.nursing import NursingPendingWorkTool
from apps.ai_assistant.tools.pharmacy import PharmacyStockSummaryTool
from apps.ai_assistant.tools.reporting import PrepareOperationalReportTool
from apps.ai_assistant.tools.tasks import PrepareOperationalTaskTool

TOOL_LEARNING_MIN_SCORE = 6
READ_TOOL_NAMES = {
    ExploreDatabaseTool.name,
    CommandCenterAlertsTool.name,
    ClinicalOperationalSummaryTool.name,
    LabRequestCollectionGuidanceTool.name,
    NursingPendingWorkTool.name,
    FinancialOperationalSummaryTool.name,
    PharmacyStockSummaryTool.name,
    EducationSummaryTool.name,
}
PREPARATION_TOOL_NAMES = {PrepareOperationalReportTool.name, PrepareOperationalTaskTool.name}


def tool_weights_from_learning(learning: dict[str, Any] | None) -> dict[str, Any]:
    payload = learning_from_metadata({"proactive_guidance_learning": learning or {}})
    weights: Counter[str] = Counter()
    evidence = []
    for key, stats in (payload.get("by_suggestion") or {}).items():
        if not isinstance(stats, dict):
            continue
        score = _score(stats)
        if score <= 0:
            continue
        tool_names = _tool_names_for_suggestion(stats)
        for tool_name in tool_names:
            weights[tool_name] += score
        if tool_names:
            evidence.append(
                {
                    "suggestion_id": key,
                    "prompt": stats.get("prompt") or "",
                    "module": stats.get("module") or "",
                    "resource_basename": stats.get("resource_basename") or "",
                    "kind": stats.get("kind") or "",
                    "score": score,
                    "tool_names": tool_names,
                }
            )
    return {
        "weights": dict(sorted(weights.items())),
        "evidence": sorted(evidence, key=lambda item: (-int(item["score"]), str(item["prompt"])))[:12],
        "scope": payload.get("scope") or {},
    }


def rank_tools_with_learning(
    *,
    selected_tools: list,
    tool_lookup: dict[str, Any],
    signals: dict[str, Any],
    learning: dict[str, Any] | None,
) -> list:
    payload = tool_weights_from_learning(learning)
    weights = payload["weights"]
    selected = _unique_tools(selected_tools)
    selected_names = {tool.name for tool in selected}

    for tool_name, weight in weights.items():
        if tool_name in selected_names:
            continue
        if weight < TOOL_LEARNING_MIN_SCORE:
            continue
        if not _can_add_tool(tool_name=tool_name, signals=signals):
            continue
        tool = tool_lookup.get(tool_name)
        if tool is None:
            continue
        selected.append(tool)
        selected_names.add(tool_name)

    original_order = {tool.name: index for index, tool in enumerate(selected)}
    return sorted(
        selected,
        key=lambda tool: (
            _execution_stage(tool.name),
            -int(weights.get(tool.name) or 0),
            original_order.get(tool.name, 999),
        ),
    )


def build_phase11_tool_learning_report() -> dict[str, Any]:
    from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance
    from apps.ai_assistant.services.registry import AiToolRegistry

    focus = {
        "intent": "financial_review",
        "resources": [{"basename": "billing-invoice", "module": "billing"}],
        "modules": ["billing"],
        "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
    }
    guidance = build_proactive_guidance(conversation_focus=focus, language="pt")
    report_suggestion = next(
        item for item in guidance["suggestions"] if item["prompt"] == "Gere um relatorio financeiro desta investigacao."
    )
    learning = {
        "by_suggestion": {
            report_suggestion["id"]: {
                **report_suggestion,
                "selected_count": 5,
                "positive_count": 2,
                "negative_count": 0,
            }
        },
        "events": [{"id": report_suggestion["id"], "event": "selected"} for _ in range(5)],
        "total_events": 7,
        "scope": {"kind": "tenant_profile", "profile_key": "groups:contabilidade"},
    }
    registry = AiToolRegistry()
    baseline = [tool.name for tool in registry.select_tools(message="faturas pendentes", active_module="ai")]
    learned = [
        tool.name
        for tool in registry.select_tools(
            message="faturas pendentes",
            active_module="ai",
            learning=learning,
        )
    ]
    report_request = [
        tool.name
        for tool in registry.select_tools(
            message="relatorio financeiro",
            active_module="ai",
            learning=learning,
        )
    ]
    weights = tool_weights_from_learning(learning)
    return {
        "phase": 11,
        "title": "Aprendizagem aplicada a seleccao de ferramentas",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "baseline_tools": baseline,
            "learned_tools": learned,
            "report_request_tools": report_request,
            "weights": weights["weights"],
            "report_not_added_without_report_signal": PrepareOperationalReportTool.name not in learned,
        },
        "priority_findings": [
            "Pesos aprendidos passam a ordenar ferramentas compatíveis antes da execução.",
            "Ferramentas de relatório e tarefa só entram quando o pedido actual tem sinal explícito.",
            "A fase 12 deve usar estes pesos para escolher perguntas de clarificação mais específicas.",
        ],
    }


def render_phase11_tool_learning_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Aprendizagem de Ferramentas Fase 11",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Ferramentas sem aprendizagem: {', '.join(summary['baseline_tools']) or '-'}",
        f"- Ferramentas com aprendizagem: {', '.join(summary['learned_tools']) or '-'}",
        f"- Pedido de relatório: {', '.join(summary['report_request_tools']) or '-'}",
        f"- Relatório não adicionado sem sinal explícito: {summary['report_not_added_without_report_signal']}",
        "",
        "## Pesos",
        "",
    ]
    lines.extend(f"- `{name}`: {score}" for name, score in summary["weights"].items())
    lines.extend(["", "## Achados Prioritarios", ""])
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase11_tool_learning_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Aprendizagem de Ferramentas Fase 11",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Ferramentas sem aprendizagem: {', '.join(summary['baseline_tools']) or '-'}",
            f"Ferramentas com aprendizagem: {', '.join(summary['learned_tools']) or '-'}",
            f"Pedido de relatório: {', '.join(summary['report_request_tools']) or '-'}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def _tool_names_for_suggestion(stats: dict[str, Any]) -> list[str]:
    module = str(stats.get("module") or "")
    basename = str(stats.get("resource_basename") or "")
    kind = str(stats.get("kind") or "")
    prompt = normalize_alias_text(str(stats.get("prompt") or stats.get("label") or ""))
    names = []

    if kind in {"filter", "question"} or (basename and kind not in {"report", "task"}):
        names.append(ExploreDatabaseTool.name)
    if module in {"billing", "payments", "accounting"} or _has_any(prompt, ("fatura", "factura", "invoice", "pagamento", "financeiro")):
        names.append(FinancialOperationalSummaryTool.name)
    if module == "pharmacy" or _has_any(prompt, ("farmacia", "medicacao", "medicamento", "stock")):
        names.append(PharmacyStockSummaryTool.name)
    if module == "monitoring" or _has_any(prompt, ("erro", "5xx", "monitoramento", "alerta")):
        names.append(CommandCenterAlertsTool.name)
    if module == "education" or _has_any(prompt, ("estudante", "matricula", "turma", "professor")):
        names.append(EducationSummaryTool.name)
    if module == "nursing" or _has_any(prompt, ("enfermagem", "procedimento", "internamento")):
        names.append(NursingPendingWorkTool.name)
    if module == "clinical" or _has_any(prompt, ("paciente", "requisicao", "resultado", "amostra")):
        names.append(ClinicalOperationalSummaryTool.name)
    if _has_any(prompt, ("frasco", "tubo", "colheita", "coleta")):
        names.append(LabRequestCollectionGuidanceTool.name)
    if kind == "report" or _has_any(prompt, ("relatorio", "report", "export")):
        names.append(PrepareOperationalReportTool.name)
    if kind == "task" or _has_any(prompt, ("tarefa", "task", "seguimento")):
        names.append(PrepareOperationalTaskTool.name)
    return list(dict.fromkeys(names))


def _can_add_tool(*, tool_name: str, signals: dict[str, Any]) -> bool:
    normalized = str(signals.get("normalized") or "")
    modules = set(signals.get("resource_modules") or [])
    if tool_name in PREPARATION_TOOL_NAMES:
        if tool_name == PrepareOperationalReportTool.name:
            return bool(signals.get("report"))
        if tool_name == PrepareOperationalTaskTool.name:
            return bool(signals.get("task"))
        return False
    if tool_name == ExploreDatabaseTool.name:
        return bool(signals.get("data") or signals.get("resource_count") or signals.get("active_module_scoped") or signals.get("has_previous_focus"))
    if tool_name == FinancialOperationalSummaryTool.name:
        return bool(modules & {"billing", "payments", "accounting"} or _has_any(normalized, ("fatura", "factura", "invoice", "pagamento", "financeiro")))
    if tool_name == PharmacyStockSummaryTool.name:
        return bool("pharmacy" in modules or _has_any(normalized, ("farmacia", "medicacao", "medicamento", "stock")))
    if tool_name == CommandCenterAlertsTool.name:
        return bool("monitoring" in modules or signals.get("monitoring"))
    if tool_name == EducationSummaryTool.name:
        return bool("education" in modules or _has_any(normalized, ("estudante", "matricula", "turma", "professor")))
    if tool_name == NursingPendingWorkTool.name:
        return bool("nursing" in modules or _has_any(normalized, ("enfermagem", "procedimento", "internamento")))
    if tool_name == ClinicalOperationalSummaryTool.name:
        return bool("clinical" in modules or _has_any(normalized, ("paciente", "requisicao", "resultado", "laboratorio")))
    if tool_name == LabRequestCollectionGuidanceTool.name:
        return _has_any(normalized, ("frasco", "tubo", "amostra", "colheita", "coleta"))
    return False


def _execution_stage(tool_name: str) -> int:
    if tool_name in READ_TOOL_NAMES:
        return 0
    if tool_name in PREPARATION_TOOL_NAMES:
        return 1
    return 2


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


def _unique_tools(tools: list) -> list:
    seen = set()
    unique = []
    for tool in tools:
        if tool.name in seen:
            continue
        seen.add(tool.name)
        unique.append(tool)
    return unique


def _has_any(normalized: str, terms: tuple[str, ...]) -> bool:
    for raw_term in terms:
        term = normalize_alias_text(raw_term)
        if not term:
            continue
        if len(term) <= 3:
            if re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized):
                return True
            continue
        if term in normalized:
            return True
    return False
