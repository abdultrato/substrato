"""Gerador PDF corporativo para relatórios operacionais por modelo."""

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
    PDF_BOTTOM_MARGIN,
    PDF_HEADER_TOP_MARGIN,
    PDF_MARGIN,
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
        return "modelo"
    base = re.sub(r"[^a-z0-9/_-]+", "_", base)
    base = base.replace("/", "_")
    base = re.sub(r"_+", "_", base).strip("_")
    return base or "modelo"


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


def generate_model_activity_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    model_info = (payload or {}).get("model") or {}
    period = (payload or {}).get("period") or {}
    summary = (payload or {}).get("summary") or {}
    status_breakdown = list((payload or {}).get("status_breakdown") or [])
    entries = list((payload or {}).get("entries") or [])
    filters = (payload or {}).get("filters") or {}
    mode = _text((payload or {}).get("mode"), default="complete").lower()

    include_status = mode in {"operational", "complete"}
    include_details = mode == "complete"

    buffer = io.BytesIO()
    page_width, _ = A5
    margin = PDF_MARGIN
    usable_width = page_width - (margin * 2)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=PDF_HEADER_TOP_MARGIN,
        bottomMargin=PDF_BOTTOM_MARGIN,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = False
    doc.barcode_value = f"MODEL-REPORT|{_text(model_info.get('app_label'), default='app')}|{_text(model_info.get('model_name'), default='model')}"

    user_documento = (
        getattr(getattr(request, "user", None), "is_authenticated", False) and getattr(request, "user", None)
    ) or None

    title_style = document_title_style("ModelReportTitle")
    section_style = document_section_style("ModelReportSection")
    generated_at = timezone.localtime().strftime("%d/%m/%Y às %H:%M")

    endpoint = _text(model_info.get("endpoint"))
    search_filter = _text(filters.get("search"), default="Nenhum")
    status_filter = _text(filters.get("status"), default="Todos")

    elements: list = []
    elements.append(Paragraph("RELATORIO OPERACIONAL POR MODELO", title_style))
    elements.append(Spacer(1, 0.22 * cm))
    elements.append(
        montar_bloco_identificacao(
            usable_width=usable_width,
            left_lines=[
                f"{bold('Modulo')}: {_text(model_info.get('group_label'))}",
                f"{bold('Recurso')}: {_text(model_info.get('resource_label'))}",
                f"{bold('Modelo')}: {_text(model_info.get('model_verbose_name_plural'))}",
                f"{bold('Endpoint')}: {endpoint}",
                f"{bold('Janela')}: {_text(period.get('start'))} -> {_text(period.get('end'))}",
            ],
            right_lines=[
                f"{bold('Modo')}: {_text(mode)}",
                f"{bold('Pesquisa')}: {search_filter}",
                f"{bold('Estado aplicado')}: {status_filter}",
                f"{bold('Emitido por')}: {institutional_user_identity(user_documento)}",
                f"{bold('Gerado em')}: {generated_at}",
            ],
        )
    )
    elements.append(Spacer(1, 0.18 * cm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    elements.append(Spacer(1, 0.16 * cm))

    _append_table(
        elements,
        "Resumo operacional",
        ["Indicador", "Valor"],
        [
            ["Registos no periodo", str(_as_int(summary.get("records_in_period")))],
            ["Registos totais (apos filtros)", str(_as_int(summary.get("records_total")))],
            ["Estados distintos", str(_as_int(summary.get("distinct_status_count")))],
            ["Primeiro registo no periodo", _text(summary.get("first_record_at"))],
            ["Ultimo registo no periodo", _text(summary.get("last_record_at"))],
            ["Taxa no periodo (%)", f"{_as_float(summary.get('period_coverage_percent')):.2f}"],
            ["Campo temporal aplicado", _text(summary.get("date_field"))],
        ],
        [usable_width * 0.58, usable_width * 0.42],
        section_style,
    )

    if include_status:
        _append_table(
            elements,
            "Distribuicao por estado",
            ["Estado", "Total"],
            [
                [
                    _text(row.get("status")),
                    str(_as_int(row.get("total"))),
                ]
                for row in status_breakdown
            ],
            [usable_width * 0.74, usable_width * 0.26],
            section_style,
        )

    if include_details:
        _append_table(
            elements,
            "Registos recentes no periodo",
            ["Data", "Identificador", "Descricao", "Estado", "Responsavel"],
            [
                [
                    _text(row.get("date")),
                    _text(row.get("identifier")),
                    _text(row.get("label")),
                    _text(row.get("status")),
                    _text(row.get("owner")),
                ]
                for row in entries
            ],
            [
                usable_width * 0.19,
                usable_width * 0.16,
                usable_width * 0.33,
                usable_width * 0.14,
                usable_width * 0.18,
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

    filename = (
        f"relatorio_modelo_"
        f"{_slug(_text(model_info.get('app_label'), default='app'))}_"
        f"{_slug(_text(model_info.get('model_name'), default='model'))}_"
        f"{_slug(_text(period.get('start'), default='periodo'))}_"
        f"{_slug(_text(period.get('end'), default='periodo'))}.pdf"
    )
    return pdf_bytes, filename


gerar_pdf_modelo_operacional = generate_model_activity_pdf
