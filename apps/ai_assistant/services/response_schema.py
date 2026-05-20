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
        "investigation": _investigation_schema(investigation=investigation, language=language),
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
