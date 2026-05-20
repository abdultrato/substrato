from __future__ import annotations

import re
from typing import Any

from django.utils import timezone


def _line(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, (list, tuple)):
        return ", ".join(_line(item) for item in value) or "-"
    if isinstance(value, dict):
        return ", ".join(f"{key}: {_line(item)}" for key, item in value.items()) or "-"
    return str(value)


def _slug(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9_-]+", "-", value or "").strip("-").lower()
    return normalized or "ai-operational-report"


def build_operational_report_file(
    *,
    payload: dict[str, Any],
    tenant,
    user,
    language: str = "pt",
) -> tuple[bytes, str, str]:
    title = payload.get("title_en") if language == "en" else payload.get("title_pt")
    title = title or payload.get("title_pt") or payload.get("title_en") or "Relatório Operacional da IA"
    generated_at = timezone.localtime()
    filters = payload.get("filters") if isinstance(payload.get("filters"), dict) else {}
    sections = payload.get("tool_summaries") if isinstance(payload.get("tool_summaries"), list) else []
    sources = payload.get("sources") if isinstance(payload.get("sources"), list) else []

    lines = [
        f"# {title}",
        "",
        f"- Gerado em: {generated_at.isoformat()}",
        f"- Tenant: {getattr(tenant, 'identifier', '') or getattr(tenant, 'name', '') or '-'}",
        f"- Utilizador: {getattr(user, 'username', '') or getattr(user, 'email', '') or '-'}",
        f"- Tipo: {payload.get('report_kind') or 'operational'}",
        "",
        "## Filtros",
    ]

    if filters:
        lines.extend(f"- {key}: {_line(value)}" for key, value in sorted(filters.items()))
    else:
        lines.append("- Sem filtros adicionais.")

    if payload.get("executive_summary"):
        lines.extend(["", "## Síntese", _line(payload.get("executive_summary"))])

    lines.append("")
    lines.append("## Métricas")
    if not sections:
        lines.append("- Nenhuma métrica estruturada foi preparada.")

    for section in sections:
        title_pt = section.get("title_pt") or section.get("tool_name") or "Secção"
        title_en = section.get("title_en") or section.get("tool_name") or "Section"
        section_title = title_en if language == "en" else title_pt
        lines.extend(["", f"### {section_title}"])

        metrics = section.get("metrics") if isinstance(section.get("metrics"), list) else []
        if metrics:
            for metric in metrics:
                label = metric.get("label_en") if language == "en" else metric.get("label_pt")
                lines.append(f"- {label or 'Metric'}: {_line(metric.get('value'))}")
        else:
            lines.append("- Sem métricas nesta secção.")

        guidance = section.get("collection_guidance") if isinstance(section.get("collection_guidance"), list) else []
        if guidance:
            lines.append("")
            lines.append("#### Guia de colheita")
            for exam in guidance:
                exam_name = exam.get("exam_name") or exam.get("exam_code") or "Exame"
                lines.append(f"- {exam_name}")
                for sample in (exam.get("sample_options") or [])[:8]:
                    lines.append(
                        "  - "
                        + " / ".join(
                            [
                                _line(sample.get("sample_name")),
                                _line(sample.get("bottle_type_label")),
                                f"{_line(sample.get('minimum_volume_ml'))} ml",
                            ]
                        )
                    )

    lines.append("")
    lines.append("## Fontes Internas")
    if sources:
        for source in sources:
            label = source.get("label") or source.get("type") or "Fonte"
            href = source.get("href") or ""
            lines.append(f"- {label}: {href}")
    else:
        lines.append("- Ferramentas internas da IA.")

    lines.extend(
        [
            "",
            "## Limitação",
            "Relatório gerado a partir de resumos operacionais autorizados. Não substitui validação clínica, financeira ou administrativa.",
            "",
        ]
    )

    filename = f"{_slug(str(payload.get('report_kind') or title))}-{generated_at.strftime('%Y%m%d-%H%M%S')}.md"
    return "\n".join(lines).encode("utf-8"), filename, "text/markdown; charset=utf-8"
