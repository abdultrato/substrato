"""Geração do PDF de histórico de faturamento por utilizador."""

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


def _val(value, default: str = "—") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


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


def generate_billing_user_history_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    """Gera PDF para relatório de faturamento por utilizador/período."""
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

    period = (payload or {}).get("period") or {}
    summary = (payload or {}).get("summary") or {}
    users = list((payload or {}).get("users") or [])
    invoices = list((payload or {}).get("invoices") or [])
    target_user = (payload or {}).get("target_user") or {}
    scope = _val((payload or {}).get("scope"), default="all")

    scope_label = "Por utilizador" if scope == "user" else "Geral (todos os utilizadores)"
    period_label = _val(period.get("label"))

    user_documento = (
        getattr(getattr(request, "user", None), "is_authenticated", False) and getattr(request, "user", None)
    ) or None

    doc.barcode_value = f"FAT-HIST|SCOPE:{scope}|PER:{_val(period.get('key'))}"

    elements: list = []
    title_style = document_title_style("BillingUserHistoryTitle")
    section_style = document_section_style("BillingUserHistorySection")

    left_lines = [
        f"{bold('Escopo')}: {scope_label}",
        f"{bold('Período')}: {period_label}",
        f"{bold('Utilizador alvo')}: {_val(target_user.get('display_name'), default='Todos')}",
    ]
    right_lines = [
        f"{bold('Faturas')}: {_val(summary.get('invoice_count'), default='0')}",
        f"{bold('Total')}: {_val(summary.get('total'), default='0.00')} MZN",
        f"{bold('Emitido por')}: {institutional_user_identity(user_documento)}",
    ]

    elements.append(Paragraph("HISTÓRICO DE FATURAMENTO", title_style))
    elements.append(Spacer(1, 0.22 * cm))
    elements.append(
        montar_bloco_identificacao(
            usable_width=usable_width,
            left_lines=left_lines,
            right_lines=right_lines,
        )
    )
    elements.append(Spacer(1, 0.18 * cm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    elements.append(Spacer(1, 0.16 * cm))

    _append_table(
        elements,
        "Resumo",
        ["Indicador", "Valor"],
        [
            ["Faturas", _val(summary.get("invoice_count"), default="0")],
            ["Subtotal", f"{_val(summary.get('subtotal'), default='0.00')} MZN"],
            ["IVA", f"{_val(summary.get('vat_amount'), default='0.00')} MZN"],
            ["Total", f"{_val(summary.get('total'), default='0.00')} MZN"],
            ["Total pago", f"{_val(summary.get('paid_total'), default='0.00')} MZN"],
            ["Total pendente", f"{_val(summary.get('pending_total'), default='0.00')} MZN"],
        ],
        usable_width,
        section_style,
    )

    _append_table(
        elements,
        "Quebra por utilizador",
        ["Utilizador", "Qtd", "Total", "Pago", "Pendente"],
        [
            [
                _val(row.get("display_name")),
                _val(row.get("invoice_count"), default="0"),
                f"{_val(row.get('total'), default='0.00')} MZN",
                f"{_val(row.get('paid_total'), default='0.00')} MZN",
                f"{_val(row.get('pending_total'), default='0.00')} MZN",
            ]
            for row in users
        ],
        usable_width,
        section_style,
    )

    _append_table(
        elements,
        "Faturas do período",
        ["Código", "Utilizador", "Paciente", "Estado", "Total"],
        [
            [
                _val(row.get("custom_id")),
                _val(row.get("created_by_name")),
                _val(row.get("patient_name")),
                _val(row.get("status")),
                f"{_val(row.get('total'), default='0.00')} MZN",
            ]
            for row in invoices
        ],
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

    period_key = _val(period.get("key"), default="annual")
    year = _val(period.get("year"), default="")
    scope_key = "user" if scope == "user" else "all"
    filename = f"historico_faturamento_{scope_key}_{period_key}_{year or 'periodo'}.pdf"
    return pdf_bytes, filename


gerar_pdf_historico_faturamento = generate_billing_user_history_pdf

