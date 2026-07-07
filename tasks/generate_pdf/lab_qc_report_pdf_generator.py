"""Geração do PDF institucional de controlo de qualidade laboratorial.

Relatório por exame (com filtros de execução) contendo, por analito, a
estatística da série, o gráfico Levey-Jennings e a tabela de registos.
"""

from datetime import datetime
import io
import logging
import math

from django.utils import timezone
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .institutional_pdf_design import (
    InstitutionalNumberedCanvas as NumberedCanvas,
    PDF_BOTTOM_MARGIN,
    PDF_HEADER_TOP_MARGIN,
    PDF_MARGIN,
    append_fim,
    bold_inst as bold,
    institutional_cell_paragraph as cell_paragraph,
    institutional_section_style as document_section_style,
    institutional_title_style as document_title_style,
    institutional_user_identity,
    institutional_montar_bloco_identificacao as montar_bloco_identificacao,
    institutional_on_page as on_page,
    pdf_encryption,
)

logger = logging.getLogger(__name__)

MAX_CHART_POINTS = 12

# Helvetica (Latin-1) só tem ¹²³; os restantes superscritos viram "^n".
_SUPERSCRIPT_FALLBACK = str.maketrans({
    "⁰": "^0", "⁴": "^4", "⁵": "^5", "⁶": "^6", "⁷": "^7", "⁸": "^8", "⁹": "^9",
})


def _pdf_safe(value: str) -> str:
    text = str(value or "").translate(_SUPERSCRIPT_FALLBACK)
    try:
        text.encode("latin-1")
        return text
    except UnicodeEncodeError:
        return text.encode("latin-1", errors="replace").decode("latin-1")


def _decimal(value) -> float | None:
    if value in (None, ""):
        return None
    try:
        number = float(str(value).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _fmt_number(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value:.2f}".rstrip("0").rstrip(".") or "0"


def _fmt_datetime(value) -> str:
    if not value:
        return "—"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    try:
        return timezone.localtime(value).strftime("%d/%m/%Y %H:%M")
    except Exception:
        return value.strftime("%d/%m/%Y %H:%M")


def _series_stats(values: list[float]) -> tuple[float, float]:
    mean = sum(values) / len(values)
    if len(values) < 2:
        return mean, 0.0
    variance = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
    return mean, math.sqrt(variance)


def _levey_jennings_drawing(points: list[float], mean: float, sd: float, width: float, unit: str) -> Drawing:
    """Gráfico Levey-Jennings: série observada + linhas de média e ±1/2/3 DP."""
    height = 5.4 * cm
    drawing = Drawing(width, height)

    limit_specs = [("+3DP", 3, colors.HexColor("#ef4444")), ("+2DP", 2, colors.HexColor("#f59e0b")),
                   ("+1DP", 1, colors.HexColor("#38bdf8")), ("Média", 0, colors.HexColor("#10b981")),
                   ("-1DP", -1, colors.HexColor("#38bdf8")), ("-2DP", -2, colors.HexColor("#f59e0b")),
                   ("-3DP", -3, colors.HexColor("#ef4444"))] if sd > 0 else [("Média", 0, colors.HexColor("#10b981"))]

    xs = list(range(1, len(points) + 1))
    data = [list(zip(xs, points))]
    for _label, factor, _color in limit_specs:
        level = mean + sd * factor
        data.append([(xs[0], level), (xs[-1], level)])

    plot = LinePlot()
    plot.x = 34
    plot.y = 18
    plot.width = width - 90
    plot.height = height - 34
    plot.data = data

    all_values = points + [mean + sd * f for _l, f, _c in limit_specs]
    span = (max(all_values) - min(all_values)) or 1.0
    plot.yValueAxis.valueMin = min(all_values) - span * 0.10
    plot.yValueAxis.valueMax = max(all_values) + span * 0.10
    plot.yValueAxis.labels.fontSize = 6
    plot.xValueAxis.valueMin = xs[0] - 0.4
    plot.xValueAxis.valueMax = xs[-1] + 0.4
    plot.xValueAxis.valueSteps = xs
    plot.xValueAxis.labels.fontSize = 6

    plot.lines[0].strokeColor = colors.HexColor("#0891b2")
    plot.lines[0].strokeWidth = 1.6
    plot.lines[0].symbol = None
    from reportlab.graphics.widgets.markers import makeMarker

    plot.lines[0].symbol = makeMarker("FilledCircle")
    plot.lines[0].symbol.size = 3
    plot.lines[0].symbol.fillColor = colors.HexColor("#0891b2")

    for index, (_label, factor, color) in enumerate(limit_specs, start=1):
        plot.lines[index].strokeColor = color
        plot.lines[index].strokeWidth = 0.8
        if factor != 0:
            plot.lines[index].strokeDashArray = [3, 3]

    drawing.add(plot)
    for _index, (label, factor, color) in enumerate(limit_specs):
        level = mean + sd * factor
        y_pos = plot.y + (level - plot.yValueAxis.valueMin) / (plot.yValueAxis.valueMax - plot.yValueAxis.valueMin) * plot.height
        drawing.add(String(plot.x + plot.width + 4, y_pos - 2, label, fontSize=5.5, fillColor=color))
    drawing.add(String(2, height - 8, f"Obtido{f' ({unit})' if unit else ''}", fontSize=6, fillColor=colors.HexColor("#475569")))
    return drawing


def generate_lab_qc_report_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    """
    Gera PDF A4 do relatório de controlo de qualidade de um exame.

    `payload`:
        test: {code, name, method}
        filters: {label: value} apresentados no cabeçalho
        sections: "all" | "grafico" | "tabela"
        analytes: [{name, code, unit, records: [{custom_id, run_at, expected, observed,
                    observed_numeric, deviation, decision_display}]}]
    """
    buffer = io.BytesIO()
    page_width, _page_height = A4
    usable_width = page_width - 2 * PDF_MARGIN

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=PDF_MARGIN,
        rightMargin=PDF_MARGIN,
        topMargin=PDF_HEADER_TOP_MARGIN,
        bottomMargin=PDF_BOTTOM_MARGIN,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = False

    test = (payload or {}).get("test") or {}
    sections = (payload or {}).get("sections") or "all"
    analytes = (payload or {}).get("analytes") or []
    filters = (payload or {}).get("filters") or {}

    doc.barcode_value = f"CQ:{test.get('code') or test.get('name') or ''}|{timezone.localtime().strftime('%Y%m%d%H%M')}"

    user_documento = (
        getattr(getattr(request, "user", None), "is_authenticated", False) and getattr(request, "user", None)
    ) or None

    style_title = document_title_style("HeadingQcReport")
    style_section = document_section_style("SectionQcReport")

    story: list = [Spacer(1, 0.35 * cm), Paragraph("RELATÓRIO DE CONTROLO DE QUALIDADE", style_title), Spacer(1, 0.2 * cm)]

    left_lines = [f"{bold('Exame')}: {test.get('code') or '—'} - {test.get('name') or '—'}"]
    if test.get("method"):
        left_lines.append(f"{bold('Método')}: {test['method']}")
    for label, value in filters.items():
        if label == "Método" and value == test.get("method"):
            continue
        left_lines.append(f"{bold(label)}: {_pdf_safe(value)}")
    right_lines = [
        f"{bold('Emitido por')}: {institutional_user_identity(user_documento)}",
        f"{bold('Emitido em')}: {timezone.localtime().strftime('%d/%m/%Y %H:%M')}",
    ]
    story.append(montar_bloco_identificacao(usable_width=usable_width, left_lines=left_lines, right_lines=right_lines))
    story.append(Spacer(1, 0.15 * cm))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.darkblue))
    story.append(Spacer(1, 0.15 * cm))

    header_bg = colors.HexColor("#ecfeff")
    table_style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), header_bg),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]
    )

    for analyte in analytes:
        records = analyte.get("records") or []
        numeric = [value for value in (_decimal(r.get("observed_numeric") or r.get("observed")) for r in records) if value is not None]
        chart_values = numeric[-MAX_CHART_POINTS:]
        block: list = [Paragraph(f"ANALITO: {_pdf_safe(analyte.get('name') or 'Exame completo')}", style_section), Spacer(1, 0.1 * cm)]

        if chart_values:
            mean, sd = _series_stats(chart_values)
            unit_suffix = f" {_pdf_safe(analyte.get('unit'))}" if analyte.get("unit") else ""
            block.append(Paragraph(
                f"n={len(chart_values)} · média {_fmt_number(mean)}{unit_suffix} · DP {_fmt_number(sd)}"
                " · alerta ±2DP · rejeição ±3DP",
                document_section_style("QcStats"),
            ))
            block.append(Spacer(1, 0.08 * cm))
            if sections in ("all", "grafico") and len(chart_values) >= 3:
                block.append(_levey_jennings_drawing(chart_values, mean, sd, usable_width, _pdf_safe(analyte.get("unit") or "")))
                block.append(Spacer(1, 0.12 * cm))

        if sections in ("all", "tabela"):
            rows = [[cell_paragraph(h, is_bold=True) for h in ["#", "Registo", "Data", "Esperado", "Obtido", "Desvio", "Conclusão"]]]
            for index, record in enumerate(records, start=1):
                rows.append([
                    cell_paragraph(str(index)),
                    cell_paragraph(str(record.get("custom_id") or "—")),
                    cell_paragraph(_fmt_datetime(record.get("run_at"))),
                    cell_paragraph(str(record.get("expected") or "—")),
                    cell_paragraph(str(record.get("observed") or "—")),
                    cell_paragraph(_fmt_number(_decimal(record.get("deviation")))),
                    cell_paragraph(str(record.get("decision_display") or "—")),
                ])
            if len(rows) == 1:
                rows.append([cell_paragraph("Sem registos.", is_bold=True)] + [""] * 6)
            widths = [0.06, 0.20, 0.15, 0.15, 0.15, 0.10, 0.19]
            table = Table(rows, colWidths=[usable_width * w for w in widths], repeatRows=1)
            table.setStyle(table_style)
            block.append(table)

        block.append(Spacer(1, 0.22 * cm))
        # Mantém título+estatística+gráfico juntos; a tabela pode quebrar página.
        story.append(KeepTogether(block[:3]))
        story.extend(block[3:])

    if not analytes:
        story.append(Paragraph("Sem registos de controlo para os filtros aplicados.", style_section))

    append_fim(story)

    slug = (test.get("code") or test.get("name") or "exame").lower().replace(" ", "_")[:40]
    filename = f"relatorio_cq_{slug}_{timezone.localtime().strftime('%Y%m%d_%H%M%S')}.pdf"

    doc.build(
        story,
        onFirstPage=lambda c, d: on_page(c, d, user=user_documento),
        onLaterPages=lambda c, d: on_page(c, d, user=user_documento),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes, filename
