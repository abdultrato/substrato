from __future__ import annotations

from typing import Any


def build_response_schema(
    *,
    tool_results: list[dict[str, Any]],
    sources: list[dict[str, Any]],
    suggested_actions: list[dict[str, Any]],
    language: str,
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
    }
