from __future__ import annotations

from typing import Any


def build_response_schema(
    *,
    tool_results: list[dict[str, Any]],
    sources: list[dict[str, Any]],
    suggested_actions: list[dict[str, Any]],
    language: str,
    investigation: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Normaliza a resposta para UI rica sem depender do texto livre do modelo."""

    cards: list[dict[str, Any]] = []
    for item in tool_results:
        result = item.get("result") or {}
        summary = result.get("summary") or {}
        title = summary.get("title_en") if language == "en" else summary.get("title_pt")
        metrics = summary.get("metrics") or []
        if not title and not metrics:
            continue
        cards.append(
            {
                "tool_name": item.get("tool_name"),
                "title": title or item.get("tool_name") or "AI tool",
                "metrics": metrics[:8],
                "duration_ms": item.get("duration_ms"),
            }
        )

    return {
        "cards": cards,
        "crud": _crud_schema(tool_results=tool_results, language=language),
        "evidence": [
            {
                "type": source.get("type") or "source",
                "label": source.get("label") or "",
                "href": source.get("href") or "",
            }
            for source in sources
        ],
        "next_steps": [
            {
                "action_type": action.get("action_type"),
                "label": action.get("label_en") if language == "en" else action.get("label_pt"),
                "requires_confirmation": bool(action.get("requires_confirmation")),
                "href": action.get("href") or action.get("result_href") or "",
            }
            for action in suggested_actions
        ],
        "analytics": _analytics_schema(tool_results=tool_results, language=language),
        "project_identity": _project_identity_schema(tool_results=tool_results),
        "knowledge_base": _knowledge_base_schema(tool_results=tool_results),
        "investigation": _investigation_schema(investigation=investigation, language=language),
    }


def _knowledge_base_schema(*, tool_results: list[dict[str, Any]]) -> dict[str, Any] | None:
    knowledge_result = next((item.get("result") for item in tool_results if item.get("tool_name") == "answer_predicted_question"), None)
    if not knowledge_result:
        return None
    knowledge = knowledge_result.get("knowledge_base") or (knowledge_result.get("summary") or {}).get("knowledge_base") or {}
    return {
        "status": knowledge.get("status") or "",
        "question": knowledge.get("question") or "",
        "answer": knowledge.get("answer") or "",
        "category": knowledge.get("category") or "",
        "score": knowledge.get("score") or 0,
        "source": knowledge.get("source") or "",
        "database_id": knowledge.get("database_id"),
        "prompt": knowledge.get("prompt") or "",
        "suggestions": (knowledge.get("suggestions") or [])[:5],
        "follow_ups": (knowledge.get("follow_ups") or [])[:5],
    }


def _project_identity_schema(*, tool_results: list[dict[str, Any]]) -> dict[str, Any] | None:
    identity_result = next((item.get("result") for item in tool_results if item.get("tool_name") == "get_project_identity"), None)
    if not identity_result:
        return None
    metadata = identity_result.get("project_identity") or (identity_result.get("summary") or {}).get("project_identity") or {}
    return {
        "repository": metadata.get("repository") or {},
        "creator": metadata.get("creator") or {},
        "first_commit": metadata.get("first_commit") or {},
        "latest_commit": metadata.get("latest_commit") or {},
        "evidence": metadata.get("evidence") or {},
    }


def _analytics_schema(*, tool_results: list[dict[str, Any]], language: str) -> dict[str, Any] | None:
    sql_result = next((item.get("result") for item in tool_results if item.get("tool_name") == "run_sql_analytics"), None)
    if not sql_result:
        return None
    analytics = sql_result.get("analytics") or {}
    summary = sql_result.get("summary") or {}
    query_kind = analytics.get("query_kind") or summary.get("query_kind") or ""
    resource = analytics.get("resource") or summary.get("resource") or {}
    resource_label = resource.get("label_en") if language == "en" else resource.get("label_pt")
    return {
        "query_kind": query_kind,
        "title": summary.get("title_en") if language == "en" else summary.get("title_pt"),
        "resource_label": resource_label or resource.get("basename") or "",
        "range": analytics.get("range") or summary.get("range"),
        "period_bucket": analytics.get("period_bucket") or summary.get("period_bucket") or "",
        "total_count": analytics.get("total_count"),
        "comparison": analytics.get("comparison") or summary.get("comparison"),
        "groups": (analytics.get("groups") or summary.get("groups") or [])[:4],
        "period_rows": (analytics.get("period_rows") or analytics.get("daily_rows") or summary.get("period_rows") or summary.get("daily_rows") or [])[:90],
        "numeric_summaries": (analytics.get("numeric_summaries") or summary.get("numeric_summaries") or [])[:5],
        "sample_rows": (analytics.get("sample_rows") or summary.get("sample_rows") or [])[:5],
        "insights": (analytics.get("insights") or summary.get("insights") or [])[:6],
        "next_questions": (analytics.get("next_questions") or summary.get("next_questions") or [])[:4],
    }


def _crud_schema(*, tool_results: list[dict[str, Any]], language: str) -> dict[str, Any] | None:
    crud_result = next((item.get("result") for item in tool_results if item.get("tool_name") == "prepare_crud_operation"), None)
    if not crud_result:
        return None
    crud = crud_result.get("crud") or {}
    resource = crud.get("resource") or {}
    return {
        "status": crud.get("status") or "",
        "operation": crud.get("operation") or "",
        "resource_label": resource.get("label_en") if language == "en" else resource.get("label_pt"),
        "payload": crud.get("payload") or {},
        "object_ref": crud.get("object_ref") or "",
        "missing_fields": crud.get("missing_fields") or [],
        "needs_object_ref": bool(crud.get("needs_object_ref")),
        "needs_fields": bool(crud.get("needs_fields")),
        "available_fields": (crud.get("available_fields") or [])[:40],
    }


def _investigation_schema(*, investigation: dict[str, Any] | None, language: str) -> dict[str, Any] | None:
    if not investigation:
        return None
    return {
        "id": investigation.get("id"),
        "custom_id": investigation.get("custom_id") or "",
        "title": investigation.get("title") or ("Investigation" if language == "en" else "Investigação"),
        "intent": investigation.get("intent") or "",
        "status": investigation.get("status") or "",
        "confidence_score": investigation.get("confidence_score") or 0,
        "findings": (investigation.get("findings") or [])[:8],
        "next_steps": (investigation.get("next_steps") or [])[:6],
        "recommended_questions": (investigation.get("recommended_questions") or [])[:5],
    }
