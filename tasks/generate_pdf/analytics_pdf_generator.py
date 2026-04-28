"""Geração do PDF de analytics para indicadores operacionais."""

from datetime import datetime
import io
import logging

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .pdf_base import (
    NumberedCanvas,
    append_fim,
    bold,
    cell_paragraph,
    document_section_style,
    document_title_style,
    institutional_user_identity,
    montar_bloco_identificacao,
    on_page,
    pdf_encryption,
)

logger = logging.getLogger(__name__)


def _fmt_range(value: str | None) -> str:
    """Formata datas ISO do payload para o padrão exibido no PDF."""
    if not value:
        return "—"
    # ISO string in API; keep safe fallback.
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return str(value)


def _as_str(v) -> str:
    """Converte valores heterogéneos para texto com fallback previsível."""
    if v is None:
        return "—"
    if isinstance(v, bool):
        return "Sim" if v else "Não"
    try:
        # Prefer 2 decimals for money-like values.
        if isinstance(v, (int, float)):
            return f"{v:,.2f}".replace(",", " ")
    except Exception:
        pass
    return str(v)


def generate_analytics_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    """
    Gera PDF A5 do relatório de estatísticas (Dashboard/Analytics).

    Espera um `payload` compatível com `/dashboard/analytics/` e retorna
    `(bytes_pdf, nome_ficheiro)`.
    """

    buffer = io.BytesIO()

    page_width, _page_height = A5
    left_margin = 1.0 * cm
    right_margin = 1.0 * cm
    top_margin = 3.8 * cm
    bottom_margin = 2.0 * cm

    usable_width = page_width - (left_margin + right_margin)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = False

    story: list = []

    range_info = (payload or {}).get("range") or {}
    inicio_iso = range_info.get("inicio")
    fim_iso = range_info.get("fim")

    # Código de barras no header (repete em todas páginas)
    try:
        doc.barcode_value = f"REL:ESTAT|INI:{(inicio_iso or '')[:10]}|FIM:{(fim_iso or '')[:10]}"
    except Exception:
        doc.barcode_value = None

    user_documento = (
        getattr(getattr(request, "user", None), "is_authenticated", False) and getattr(request, "user", None)
    ) or None

    style_title = document_title_style("HeadingAnalytics")
    style_section = document_section_style("SectionAnalytics")

    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("RELATÓRIO DE ESTATÍSTICAS", style_title))
    story.append(Spacer(1, 0.2 * cm))

    left_lines = [
        f"{bold('Período')}: {_fmt_range(inicio_iso)} até {_fmt_range(fim_iso)}",
    ]
    right_lines = [
        f"{bold('Emitido por')}: {institutional_user_identity(user_documento)}",
    ]

    story.append(
        montar_bloco_identificacao(
            usable_width=usable_width,
            left_lines=left_lines,
            right_lines=right_lines,
        )
    )
    story.append(Spacer(1, 0.15 * cm))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.darkblue))
    story.append(Spacer(1, 0.15 * cm))

    kpis: dict = (payload or {}).get("kpis") or {}

    story.append(Paragraph("INDICADORES", style_section))
    story.append(Spacer(1, 0.12 * cm))

    kpi_rows = [[cell_paragraph("Indicador", is_bold=True), cell_paragraph("Valor", is_bold=True)]]
    for key in sorted(kpis.keys()):
        kpi_rows.append([cell_paragraph(str(key)), cell_paragraph(_as_str(kpis.get(key)))])

    kpi_table = Table(kpi_rows, colWidths=[usable_width * 0.70, usable_width * 0.30])
    kpi_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2ff")),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(kpi_table)
    story.append(Spacer(1, 0.18 * cm))

    def add_top_section(title: str, headers: list[str], rows: list[list[str]]):
        story.append(Paragraph(title, style_section))
        story.append(Spacer(1, 0.12 * cm))
        date = [[cell_paragraph(h, is_bold=True) for h in headers]]
        for r in rows:
            date.append([cell_paragraph(v) for v in r])
        if len(date) == 1:
            date.append([cell_paragraph("Sem dados.", is_bold=True)] + [""] * (len(headers) - 1))
        table = Table(date, colWidths=[usable_width / len(headers)] * len(headers))
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                    ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 0.18 * cm))

    top_exams = (payload or {}).get("top_exams") or []
    add_top_section(
        "EXAMES MAIS SOLICITADOS",
        ["Tipo", "Exame", "Total"],
        [[str(r.get("type") or "—"), str(r.get("name") or "—"), str(r.get("total") or 0)] for r in top_exams],
    )

    top_procs = (payload or {}).get("top_procedures") or []
    add_top_section(
        "PROCEDIMENTOS MAIS SOLICITADOS",
        ["Procedimento", "Total"],
        [[str(r.get("catalog__name") or "—"), str(r.get("total") or 0)] for r in top_procs],
    )

    top_meds = (payload or {}).get("top_medicamentos") or []
    add_top_section(
        "MEDICAMENTOS MAIS REQUISITADOS",
        ["Medicamento", "Quantidade", "Pedidos"],
        [
            [
                str(r.get("product__name") or "—"),
                str(r.get("total_quantity") or 0),
                str(r.get("total_pedidos") or 0),
            ]
            for r in top_meds
        ],
    )

    top_cons = (payload or {}).get("top_consultations") or []
    add_top_section(
        "CONSULTAS MAIS MARCADAS",
        ["Consulta", "Total"],
        [[str(r.get("type") or "—"), str(r.get("total") or 0)] for r in top_cons],
    )

    append_fim(story)

    filename = f"relatorio_estatisticas_{timezone.localtime().strftime('%Y%m%d_%H%M%S')}.pdf"

    doc.build(
        story,
        onFirstPage=lambda c, d: on_page(c, d, user=user_documento),
        onLaterPages=lambda c, d: on_page(c, d, user=user_documento),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes, filename


gerar_pdf_analytics = generate_analytics_pdf
