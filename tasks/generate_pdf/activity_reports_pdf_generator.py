"""Gerador de PDF para relatórios de actividade por página."""

from __future__ import annotations

import io
import re

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .pdf_base import (
    FONT_BOLD,
    NumberedCanvas,
    append_fim,
    bold,
    cell_paragraph,
    document_section_style,
    document_title_style,
    draw_line_full_width,
    institutional_user_identity,
    montar_bloco_identificacao,
    on_page,
    pdf_encryption,
)


def _text(value, default: str = "—") -> str:
    if value is None:
        return default
    txt = str(value).strip()
    return txt if txt else default


def _as_int(value, default: int = 0) -> int:
    try:
        return int(value or 0)
    except Exception:
        return default


def _as_float(value, default: float = 0.0) -> float:
    try:
        return float(value or 0)
    except Exception:
        return default


def _slug(value: str) -> str:
    base = (value or "").strip().lower()
    if not base:
        return "todas_as_paginas"
    base = re.sub(r"[^a-z0-9/_-]+", "_", base)
    base = base.replace("/", "_")
    base = re.sub(r"_+", "_", base).strip("_")
    return base or "todas_as_paginas"


def _append_table(elements: list, title: str, headers: list[str], rows: list[list[str]], col_widths: list[float], style):
    elements.append(Paragraph(title, style))
    elements.append(Spacer(1, 0.12 * cm))

    data = [[cell_paragraph(h, is_bold=True) for h in headers]]
    for row in rows:
        data.append([cell_paragraph(col) for col in row])

    if len(data) == 1:
        data.append([cell_paragraph("Sem dados.", is_bold=True)] + [cell_paragraph("") for _ in headers[1:]])

    table = Table(data, colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 0.16 * cm))


def generate_activity_report_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    summary = (payload or {}).get("summary") or {}
    activities = list((payload or {}).get("activities") or [])
    entries = list((payload or {}).get("entries") or [])
    period = (payload or {}).get("period") or {}
    page = (payload or {}).get("page") or {}
    mode = _text((payload or {}).get("mode"), default="complete").lower()
    scope = _text((payload or {}).get("scope"), default="user")

    include_general = mode in {"general", "complete"}
    include_activity = mode in {"activity", "complete"}
    include_details = mode == "complete"

    buffer = io.BytesIO()
    page_width, _ = A5
    margin = 1 * cm
    usable_width = page_width - (margin * 2)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=3.8 * cm,
        bottomMargin=2.0 * cm,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = False
    doc.barcode_value = f"ATV-REL|{_text(period.get('key'), default='GEN')}"

    user_documento = (
        getattr(getattr(request, "user", None), "is_authenticated", False) and getattr(request, "user", None)
    ) or None

    title_style = document_title_style("ActivityReportTitle")
    section_style = document_section_style("ActivityReportSection")

    generated_at = timezone.localtime().strftime("%d/%m/%Y às %H:%M")

    elements: list = []
    elements.append(Paragraph("RELATÓRIO DE ACTIVIDADES DA PÁGINA", title_style))
    elements.append(Spacer(1, 0.22 * cm))
    elements.append(
        montar_bloco_identificacao(
            usable_width=usable_width,
            left_lines=[
                f"{bold('Página')}: {_text(page.get('label'), default='Todas as páginas')}",
                f"{bold('Período')}: {_text(period.get('label'), default='—')}",
                f"{bold('Intervalo')}: {_text(period.get('start'), default='—')} -> {_text(period.get('end'), default='—')}",
                f"{bold('Modo')}: {_text(mode)}",
            ],
            right_lines=[
                f"{bold('Escopo')}: {_text(scope)}",
                f"{bold('Emitido por')}: {institutional_user_identity(user_documento)}",
                f"{bold('Gerado em')}: {generated_at}",
            ],
        )
    )
    elements.append(Spacer(1, 0.18 * cm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    elements.append(Spacer(1, 0.16 * cm))

    if include_general:
        _append_table(
            elements,
            "Resumo geral",
            ["Indicador", "Valor"],
            [
                ["Total de actividades", str(_as_int(summary.get("total_activities")))],
                ["Tipos de actividade", str(_as_int(summary.get("total_activity_types")))],
                ["Sucessos", str(_as_int(summary.get("success_count")))],
                ["Erros", str(_as_int(summary.get("error_count")))],
                ["Utilizadores únicos", str(_as_int(summary.get("unique_users")))],
                ["Duração média (ms)", f"{_as_float(summary.get('average_duration_ms')):.2f}"],
            ],
            [usable_width * 0.60, usable_width * 0.40],
            section_style,
        )

    if include_activity:
        _append_table(
            elements,
            "Actividades por tipo",
            ["Actividade", "Método", "Rota", "Total", "OK", "Erro"],
            [
                [
                    _text(row.get("activity")),
                    _text(row.get("method")),
                    _text(row.get("path")),
                    str(_as_int(row.get("total"))),
                    str(_as_int(row.get("success_count"))),
                    str(_as_int(row.get("error_count"))),
                ]
                for row in activities
            ],
            [
                usable_width * 0.27,
                usable_width * 0.11,
                usable_width * 0.32,
                usable_width * 0.10,
                usable_width * 0.10,
                usable_width * 0.10,
            ],
            section_style,
        )

    if include_details:
        _append_table(
            elements,
            "Detalhes de actividades",
            ["Data/Hora", "Utilizador", "Actividade", "Status", "Duração(ms)"],
            [
                [
                    _text(row.get("created_at")),
                    _text(row.get("user_name")),
                    _text(row.get("activity")),
                    _text(row.get("status_code")),
                    _text(row.get("duration_ms"), default="0"),
                ]
                for row in entries
            ],
            [
                usable_width * 0.21,
                usable_width * 0.23,
                usable_width * 0.34,
                usable_width * 0.10,
                usable_width * 0.12,
            ],
            section_style,
        )

    append_fim(elements)

    doc.build(
        elements,
        onFirstPage=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"relatorio_atividades_{_text(period.get('key'), default='periodo')}_{_slug(_text(page.get('path'), default=''))}.pdf"
    return pdf_bytes, filename


gerar_pdf_atividades = generate_activity_report_pdf
