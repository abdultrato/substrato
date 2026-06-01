from __future__ import annotations

from typing import Any


def build_natural_bridge(
    *,
    question: str,
    language: str,
    active_module: str = "",
    tool_results: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Builds a compact bridge between natural language, modules and DB-backed tools."""

    language = "en" if language == "en" else "pt"
    tool_results = tool_results or []
    tool_names = [str(item.get("tool_name") or "") for item in tool_results if item.get("tool_name")]
    resources = _collect_resources(tool_results=tool_results, language=language)
    modules = _collect_modules(resources=resources, tool_results=tool_results, active_module=active_module, language=language)
    database_scope = _database_scope(tool_names=tool_names)

    has_database_bridge = database_scope in {"tenant_rbac_parameterized_sql", "tenant_rbac_safe_samples"}
    if not (resources or modules or has_database_bridge):
        return {
            "status": "empty",
            "language": language,
            "active_module": active_module or "",
            "conversation_mode": "human_summary",
            "privacy_mode": "summary_only",
            "modules": [],
            "resources": [],
            "database_scope": "",
            "privacy_note": _privacy_note(language=language),
            "lead": "",
            "narrative_items": [],
            "suggested_questions": [],
            "tool_names": tool_names,
        }

    lead = _lead(language=language, modules=modules, resources=resources, database_scope=database_scope)
    narrative_items = _narrative_items(language=language, resources=resources, modules=modules, database_scope=database_scope)
    return {
        "status": "connected",
        "language": language,
        "active_module": active_module or "",
        "conversation_mode": "human_summary",
        "privacy_mode": "summary_only",
        "modules": modules[:8],
        "resources": resources[:8],
        "database_scope": database_scope,
        "privacy_note": _privacy_note(language=language),
        "lead": lead,
        "narrative_items": narrative_items,
        "suggested_questions": _suggested_questions(language=language, resources=resources, modules=modules),
        "tool_names": tool_names,
    }


def polish_natural_answer(*, answer: str, bridge: dict[str, Any] | None, language: str) -> str:
    """Replaces repetitive opening boilerplate with the bridge lead, preserving evidence and limits."""

    answer = answer or ""
    bridge = bridge or {}
    lead = str(bridge.get("lead") or "").strip()
    if bridge.get("status") != "connected" or not lead or _should_keep_answer_unchanged(answer=answer, language=language):
        return answer

    paragraphs = [part.strip() for part in answer.split("\n\n")]
    if not paragraphs:
        return lead

    first = paragraphs[0]
    if _is_repetitive_opening(first=first, language=language):
        paragraphs[0] = lead
    elif lead not in answer:
        paragraphs.insert(0, lead)
    return "\n\n".join(part for part in paragraphs if part)


def _collect_resources(*, tool_results: list[dict[str, Any]], language: str) -> list[dict[str, Any]]:
    resources: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in tool_results:
        result = item.get("result") or {}
        for resource in _iter_result_resources(result=result):
            basename = str(resource.get("basename") or "")
            if not basename or basename in seen:
                continue
            seen.add(basename)
            label = resource.get("label_en") if language == "en" else resource.get("label_pt")
            module_label = resource.get("module_label_en") if language == "en" else resource.get("module_label_pt")
            resources.append(
                {
                    "basename": basename,
                    "label": label or resource.get("label") or basename,
                    "label_pt": resource.get("label_pt") or resource.get("label") or basename,
                    "label_en": resource.get("label_en") or resource.get("label") or basename,
                    "module": resource.get("module") or resource.get("prefix") or "",
                    "module_label": module_label or resource.get("module_label") or resource.get("module") or "",
                    "module_label_pt": resource.get("module_label_pt") or resource.get("module_label") or "",
                    "module_label_en": resource.get("module_label_en") or resource.get("module_label") or "",
                    "filtered_count": resource.get("filtered_count"),
                    "total_count": resource.get("total_count"),
                }
            )
    return resources


def _iter_result_resources(*, result: dict[str, Any]) -> list[dict[str, Any]]:
    resources: list[dict[str, Any]] = []
    summary = result.get("summary") or {}

    for item in result.get("resource_results") or summary.get("resource_results") or []:
        if isinstance(item, dict):
            resources.append(item)

    analytics = result.get("analytics") or {}
    for item in (analytics.get("resource"), summary.get("resource")):
        if isinstance(item, dict) and item:
            resources.append(item)

    for item in result.get("catalog") or summary.get("catalog") or []:
        if isinstance(item, dict):
            resources.append(item)
    return resources


def _collect_modules(
    *,
    resources: list[dict[str, Any]],
    tool_results: list[dict[str, Any]],
    active_module: str,
    language: str,
) -> list[dict[str, Any]]:
    modules: dict[str, dict[str, Any]] = {}
    for resource in resources:
        key = str(resource.get("module") or "")
        if not key:
            continue
        current = modules.setdefault(
            key,
            {
                "module": key,
                "label": resource.get("module_label") or key,
                "label_pt": resource.get("module_label_pt") or resource.get("module_label") or key,
                "label_en": resource.get("module_label_en") or resource.get("module_label") or key,
                "resource_count": 0,
            },
        )
        current["resource_count"] += 1

    for item in tool_results:
        result = item.get("result") or {}
        summary = result.get("summary") or {}
        for module in result.get("accessible_modules") or summary.get("accessible_modules") or []:
            if not isinstance(module, dict):
                continue
            key = str(module.get("module") or "")
            if not key:
                continue
            label = module.get("label_en") if language == "en" else module.get("label_pt")
            modules.setdefault(
                key,
                {
                    "module": key,
                    "label": label or key,
                    "label_pt": module.get("label_pt") or key,
                    "label_en": module.get("label_en") or key,
                    "resource_count": module.get("resource_count") or 0,
                },
            )

    active_module = (active_module or "").strip()
    if active_module and active_module not in {"ai", "ia", "assistant", "ai_assistant"}:
        modules.setdefault(
            active_module,
            {
                "module": active_module,
                "label": active_module,
                "label_pt": active_module,
                "label_en": active_module,
                "resource_count": 0,
            },
        )
    return sorted(modules.values(), key=lambda item: (str(item.get("label") or ""), str(item.get("module") or "")))


def _database_scope(*, tool_names: list[str]) -> str:
    if "run_sql_analytics" in tool_names:
        return "tenant_rbac_parameterized_sql"
    if "explore_database" in tool_names:
        return "tenant_rbac_safe_samples"
    if tool_names:
        return "tenant_rbac_tool_summary"
    return ""


def _lead(*, language: str, modules: list[dict[str, Any]], resources: list[dict[str, Any]], database_scope: str) -> str:
    module_text = _join_labels([str(item.get("label") or item.get("module") or "") for item in modules[:3]], language=language)
    resource_text = _join_labels([str(item.get("label") or item.get("basename") or "") for item in resources[:3]], language=language)
    if language == "en":
        if resource_text and module_text:
            return f"I linked your question to {resource_text} in {module_text} and will answer as a summary, without exposing tables or individual records."
        if module_text:
            return f"I used your module context in {module_text} and kept the answer conversational, without opening raw database data."
        return "I used the internal tools with tenant and RBAC scope, then turned the result into a conversational summary."

    if resource_text and module_text:
        return f"Liguei a sua pergunta a {resource_text} no módulo {module_text} e vou responder em resumo, sem expor tabelas nem registos individuais."
    if module_text:
        return f"Usei o contexto do módulo {module_text} e mantive a resposta conversacional, sem abrir dados brutos do banco."
    if database_scope:
        return "Usei as ferramentas internas com tenant e RBAC, transformando o resultado em resumo conversacional."
    return ""


def _privacy_note(*, language: str) -> str:
    if language == "en":
        return "I do not expose raw tables, direct database rows or record links in the chat response."
    return "Não exponho tabelas brutas, linhas directas do banco nem ligações para registos na resposta do chat."


def _narrative_items(
    *,
    language: str,
    resources: list[dict[str, Any]],
    modules: list[dict[str, Any]],
    database_scope: str,
) -> list[str]:
    items: list[str] = []
    if resources:
        for resource in resources[:4]:
            label = str(resource.get("label") or resource.get("basename") or "").strip()
            count = resource.get("filtered_count")
            if count is None:
                count = resource.get("total_count")
            if not label:
                continue
            if isinstance(count, int):
                if language == "en":
                    items.append(f"{label}: {count} matching item(s) in your authorized scope.")
                else:
                    items.append(f"{label}: {count} item(ns) no seu escopo autorizado.")
            else:
                if language == "en":
                    items.append(f"{label}: I can summarize this area without listing individual records.")
                else:
                    items.append(f"{label}: consigo resumir esta área sem listar registos individuais.")
    elif modules:
        module_names = _join_labels([str(item.get("label") or item.get("module") or "") for item in modules[:3]], language=language)
        if module_names:
            if language == "en":
                items.append(f"Context detected in {module_names}; ask for a period, status or priority to narrow it.")
            else:
                items.append(f"Contexto detectado em {module_names}; indique período, estado ou prioridade para afinar.")

    if database_scope:
        items.append(
            "Response mode: narrative summary only." if language == "en" else "Modo de resposta: resumo narrativo apenas."
        )
    return _dedupe(items)[:6]


def _suggested_questions(*, language: str, resources: list[dict[str, Any]], modules: list[dict[str, Any]]) -> list[str]:
    questions: list[str] = []
    for resource in resources[:3]:
        label = str(resource.get("label") or resource.get("basename") or "").strip()
        if not label:
            continue
        lower = label[:1].lower() + label[1:]
        if language == "en":
            questions.extend(
                [
                    f"Show only recent {lower}.",
                    f"Group {lower} by status.",
                ]
            )
        else:
            questions.extend(
                [
                    f"Mostre apenas {lower} recentes.",
                    f"Agrupe {lower} por estado.",
                ]
            )
    if modules:
        module_label = str(modules[0].get("label") or modules[0].get("module") or "").strip()
        if module_label:
            questions.append(
                f"Generate an operational report for {module_label}."
                if language == "en"
                else f"Gere um relatório operacional de {module_label}."
            )
    return _dedupe(questions)[:6]


def _join_labels(labels: list[str], *, language: str) -> str:
    clean = [label for label in labels if label]
    if not clean:
        return ""
    if len(clean) == 1:
        return clean[0]
    connector = " and " if language == "en" else " e "
    return ", ".join(clean[:-1]) + connector + clean[-1]


def _dedupe(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        key = value.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


def _should_keep_answer_unchanged(*, answer: str, language: str) -> bool:
    normalized = answer.lower()
    blocked_terms = (
        ("não posso", "não consegui", "não tem acesso", "acesso negado")
        if language != "en"
        else ("i cannot", "i could not", "access denied", "does not have access")
    )
    return any(term in normalized for term in blocked_terms)


def _is_repetitive_opening(*, first: str, language: str) -> bool:
    normalized = first.lower().strip()
    if language == "en":
        return normalized.startswith(("i queried only", "you can investigate", "i queried "))
    return normalized.startswith(("consultei apenas", "pode investigar", "consultei "))
