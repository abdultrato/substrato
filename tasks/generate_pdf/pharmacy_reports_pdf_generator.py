"""Geradores de PDF para relatórios operacionais da farmácia."""

from __future__ import annotations

import io

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


def _append_table(elements: list, title: str, headers: list[str], rows: list[list[str]], usable_width: float, style):
    elements.append(Paragraph(title, style))
    elements.append(Spacer(1, 0.12 * cm))

    data = [[cell_paragraph(h, is_bold=True) for h in headers]]
    for row in rows:
        data.append([cell_paragraph(col) for col in row])
    if len(data) == 1:
        data.append([cell_paragraph("Sem dados.", is_bold=True)] + [cell_paragraph("") for _ in headers[1:]])

    table = Table(data, colWidths=[usable_width / len(headers)] * len(headers))
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


def _build_document(title: str, payload: dict, request=None, summary_rows: list[list[str]] | None = None, table_sections: list[dict] | None = None):
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
    doc.barcode_value = f"FAR-REL|{_text((payload or {}).get('report_type'), default='GEN')}"

    user_documento = (
        getattr(getattr(request, "user", None), "is_authenticated", False) and getattr(request, "user", None)
    ) or None

    filters = (payload or {}).get("filters") or {}
    filters_txt = ", ".join(f"{k}: {_text(v)}" for k, v in filters.items() if v not in (None, "", False)) or "Sem filtros"

    elements: list = []
    title_style = document_title_style("PharmacyReportTitle")
    section_style = document_section_style("PharmacyReportSection")

    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 0.22 * cm))
    elements.append(
        montar_bloco_identificacao(
            usable_width=usable_width,
            left_lines=[
                f"{bold('Filtros')}: {filters_txt}",
                f"{bold('Gerado em')}: {_text((payload or {}).get('generated_at'))}",
            ],
            right_lines=[
                f"{bold('Emitido por')}: {institutional_user_identity(user_documento)}",
            ],
        )
    )
    elements.append(Spacer(1, 0.18 * cm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    elements.append(Spacer(1, 0.16 * cm))

    if summary_rows:
        _append_table(
            elements,
            "Resumo",
            ["Indicador", "Valor"],
            [[_text(k), _text(v)] for k, v in summary_rows],
            usable_width,
            section_style,
        )

    for section in table_sections or []:
        _append_table(
            elements,
            section.get("title") or "Dados",
            section.get("headers") or [],
            section.get("rows") or [],
            usable_width,
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
    return pdf_bytes


def generate_pharmacy_movements_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    summary = (payload or {}).get("summary") or {}
    rows = list((payload or {}).get("rows") or [])

    pdf_bytes = _build_document(
        title="HISTÓRICO DE ENTRADAS E SAÍDAS",
        payload=payload,
        request=request,
        summary_rows=[
            ["Total de movimentos", summary.get("moves_count", 0)],
            ["Entradas (qtd.)", summary.get("total_entries", 0)],
            ["Saídas (qtd.)", summary.get("total_exits", 0)],
            ["Ajustes (qtd.)", summary.get("total_adjustments", 0)],
        ],
        table_sections=[
            {
                "title": "Movimentos",
                "headers": ["Data/Hora", "Código", "Tipo", "Origem", "Produto", "Lote", "Qtd", "Setor", "Requisição"],
                "rows": [
                    [
                        _text(r.get("created_at")),
                        _text(r.get("movement_code")),
                        _text(r.get("type")),
                        _text(r.get("origin")),
                        _text(r.get("product_name")),
                        _text(r.get("lot_number")),
                        _text(r.get("quantity"), default="0"),
                        _text(r.get("sector")),
                        _text(r.get("requisition_code")),
                    ]
                    for r in rows
                ],
            }
        ],
    )
    filename = "historico_entradas_saidas_farmacia.pdf"
    return pdf_bytes, filename


def generate_pharmacy_stock_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    summary = (payload or {}).get("summary") or {}
    rows = list((payload or {}).get("rows") or [])

    pdf_bytes = _build_document(
        title="ESTOQUE EXISTENTE - FARMÁCIA",
        payload=payload,
        request=request,
        summary_rows=[
            ["Produtos com saldo", summary.get("products_count", 0)],
            ["Lotes com saldo", summary.get("lots_count", 0)],
            ["Saldo total (unid.)", summary.get("total_balance", 0)],
        ],
        table_sections=[
            {
                "title": "Lotes com saldo",
                "headers": ["Produto", "Lote", "Validade", "Saldo", "Preço", "Vencido"],
                "rows": [
                    [
                        _text(r.get("product_name")),
                        _text(r.get("lot_number")),
                        _text(r.get("expiration_date")),
                        _text(r.get("balance"), default="0"),
                        _text(r.get("sale_price"), default="0.00"),
                        "Sim" if bool(r.get("is_expired")) else "Não",
                    ]
                    for r in rows
                ],
            }
        ],
    )
    filename = "estoque_existente_farmacia.pdf"
    return pdf_bytes, filename


def generate_pharmacy_sector_movements_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    summary = (payload or {}).get("summary") or {}
    rows = list((payload or {}).get("rows") or [])

    pdf_bytes = _build_document(
        title="MOVIMENTOS DE INSUMOS POR SETOR",
        payload=payload,
        request=request,
        summary_rows=[
            ["Movimentos", summary.get("moves_count", 0)],
            ["Quantidade total aviada", summary.get("total_quantity", 0)],
            ["Requisições atendidas", summary.get("requisitions_count", 0)],
        ],
        table_sections=[
            {
                "title": "Histórico por setor solicitante",
                "headers": ["Data/Hora", "Requisição", "Setor", "Departamento", "Produto", "Lote", "Qtd"],
                "rows": [
                    [
                        _text(r.get("created_at")),
                        _text(r.get("requisition_code")),
                        _text(r.get("sector")),
                        _text(r.get("department")),
                        _text(r.get("product_name")),
                        _text(r.get("lot_number")),
                        _text(r.get("quantity"), default="0"),
                    ]
                    for r in rows
                ],
            }
        ],
    )
    filename = "historico_movimentos_setor_farmacia.pdf"
    return pdf_bytes, filename


gerar_pdf_historico_movimentos_farmacia = generate_pharmacy_movements_pdf
gerar_pdf_estoque_farmacia = generate_pharmacy_stock_pdf
gerar_pdf_movimentos_setor_farmacia = generate_pharmacy_sector_movements_pdf

