"""Geração do PDF de recibo associado a pagamentos de faturas."""

from decimal import Decimal
import io
import logging

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

logger = logging.getLogger(__name__)


def _formatar_dt(value) -> str:
    """Formata data/hora para o padrão institucional dos PDFs."""
    if not value:
        return "—"
    try:
        return value.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return str(value)


def _item_code(item) -> str:
    """Resolve o código do item faturável (exame ou exame médico)."""
    exam = getattr(item, "exam", None) or getattr(item, "medical_exam", None)
    if not exam:
        return ""
    return getattr(exam, "code", "") or getattr(exam, "custom_id", "") or ""


def generate_receipt_pdf(recibo, request=None) -> tuple[bytes, str]:
    """
    Gera o PDF A5 do recibo (documento separado da fatura).

    Retorna uma tupla com os bytes do documento e o nome de ficheiro.
    """

    buffer = io.BytesIO()

    # ==========================
    # A5 HARD GUARANTEE
    # ==========================
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

    invoice = getattr(recibo, "invoice", None)
    payment = getattr(recibo, "payment", None)
    patient = getattr(invoice, "patient", None) if invoice else None

    # Código de barras no header (repete em todas páginas)
    try:
        doc.barcode_value = (
            f"PAC:{getattr(patient, 'custom_id', '')}"
            f"|REC:{getattr(recibo, 'number', '')}"
            f"|FAT:{getattr(invoice, 'custom_id', '') if invoice else ''}"
        )
    except Exception:
        doc.barcode_value = None

    user_documento = getattr(payment, "created_by", None) or getattr(invoice, "created_by", None)

    # ==========================
    # ESTILOS
    # ==========================
    style_title = document_title_style("HeadingRec")
    style_section = document_section_style("section_rec")

    # ==========================
    # CABEÇALHO DO DOCUMENTO
    # ==========================
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("RECIBO", style_title))
    story.append(Spacer(1, 0.2 * cm))

    # ==========================
    # BLOCO ESQUERDA (PACIENTE)
    # ==========================
    if patient:
        idade = getattr(patient, "idade", None)
        idade_txt = idade() if callable(idade) else "—"
        left_lines = [
            f"{bold('Paciente')}: {getattr(patient, 'name', '—')}",
            f"{bold('Idade')}: {idade_txt}  -  {bold('Gênero')}: {getattr(patient, 'gender', '—') or '—'}",
            f"{bold('Documento')}: {getattr(patient, 'document_type', '—') or '—'}  {getattr(patient, 'document_number', '—') or '—'}",
            f"{bold('Contacto')}: {getattr(patient, 'contact', '—') or '—'}",
        ]
        if getattr(patient, "email", None):
            left_lines.append(f"{bold('E-mail')}: {patient.email or '—'}")
        if getattr(patient, "provenance", None):
            left_lines.append(f"{bold('Proveniência')}: {getattr(patient, 'provenance', '—') or '—'}")
    else:
        left_lines = [f"{bold('Paciente')}: —"]

    # ==========================
    # BLOCO DIREITA (RECIBO)
    # ==========================
    method_txt = ""
    status_txt = ""
    paid_at = None
    if payment:
        try:
            method_txt = payment.get_method_display()
        except Exception:
            method_txt = getattr(payment, "method", "") or ""
        try:
            status_txt = payment.get_status_display()
        except Exception:
            status_txt = getattr(payment, "status", "") or ""
        paid_at = getattr(payment, "paid_at", None)

    technician_texto = institutional_user_identity(user_documento)

    right_lines = [
        f"{bold('Recibo')}: {getattr(recibo, 'number', '—')}",
        f"{bold('Fatura')}: {getattr(invoice, 'custom_id', '—') if invoice else '—'}",
        f"{bold('Pagamento')}: {getattr(payment, 'custom_id', getattr(payment, 'pk', '—')) if payment else '—'}",
        f"{bold('Método')}: {method_txt or '—'}",
        f"{bold('Status')}: {status_txt or '—'}",
        f"{bold('Pago em')}: {_formatar_dt(paid_at) if paid_at else _formatar_dt(getattr(recibo, 'created_at', None))}",
        f"{bold('Emitido por')}: {technician_texto}",
    ]

    info_table = montar_bloco_identificacao(
        usable_width=usable_width,
        left_lines=left_lines,
        right_lines=right_lines,
    )

    story.append(info_table)
    story.append(Spacer(1, 0.15 * cm))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.darkblue))
    story.append(Spacer(1, 0.15 * cm))

    # ==========================
    # ITENS PAGOS (DA FATURA)
    # ==========================
    story.append(Paragraph("ITENS PAGOS", style_section))
    story.append(Spacer(1, 0.12 * cm))

    date = [
        [
            cell_paragraph("Descrição", is_bold=True),
            cell_paragraph("Qtd", is_bold=True),
            cell_paragraph("Preço", is_bold=True),
            cell_paragraph("Subtotal", is_bold=True),
        ]
    ]

    itens_qs = invoice.items.select_related("exam", "medical_exam").all() if invoice else []
    subtotal_geral = Decimal("0.00")

    for item in itens_qs:
        qtd = getattr(item, "quantity", Decimal("1.00")) or Decimal("1.00")
        price_unit = getattr(item, "unit_price", Decimal("0.00")) or Decimal("0.00")
        try:
            qtd = Decimal(str(qtd))
        except Exception:
            qtd = Decimal("1.00")
        try:
            price_unit = Decimal(str(price_unit))
        except Exception:
            price_unit = Decimal("0.00")

        total_linha = (qtd * price_unit).quantize(Decimal("0.01"))
        subtotal_geral += total_linha

        code = _item_code(item)
        name = ""
        exam = getattr(item, "exam", None) or getattr(item, "medical_exam", None)
        if exam:
            name = getattr(exam, "name", "") or ""
        exam_txt = f"{code.upper()} - {name}" if code else (name or "")
        description = getattr(item, "description", None) or exam_txt or "—"

        date.append(
            [
                cell_paragraph(description),
                cell_paragraph(f"{qtd}".replace(".", ",")),
                cell_paragraph(f"{price_unit:,.2f} MZN".replace(",", " ")),
                cell_paragraph(f"{total_linha:,.2f} MZN".replace(",", " ")),
            ]
        )

    if invoice and not invoice.items.exists():
        date.append([cell_paragraph("Nenhum item registrado.", is_bold=True), "", "", ""])

    table = Table(
        date,
        colWidths=[
            usable_width * 0.55,
            usable_width * 0.10,
            usable_width * 0.17,
            usable_width * 0.18,
        ],
    )

    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    story.append(table)
    story.append(Spacer(1, 0.18 * cm))

    # ==========================
    # RESUMO
    # ==========================
    total_sem_iva = getattr(invoice, "subtotal", None) if invoice else None
    total_iva = getattr(invoice, "vat_amount", None) if invoice else None
    total_com_iva = getattr(invoice, "total_a_pagar", None) if invoice else None
    if total_com_iva is None:
        total_com_iva = getattr(invoice, "total", None) if invoice else None

    def _as_money(v):
        if v is None:
            return "—"
        try:
            return f"{Decimal(str(v)):,.2f} MZN".replace(",", " ")
        except Exception:
            return f"{v} MZN"

    resumo = Table(
        [
            [cell_paragraph("Total sem IVA", is_bold=True), cell_paragraph(_as_money(total_sem_iva))],
            [cell_paragraph("Total de IVA", is_bold=True), cell_paragraph(_as_money(total_iva))],
            [
                cell_paragraph("Total pago", is_bold=True),
                cell_paragraph(_as_money(getattr(recibo, "value", total_com_iva))),
            ],
        ],
        colWidths=[usable_width * 0.55, usable_width * 0.45],
    )
    resumo.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    story.append(Spacer(1, 0.15 * cm))
    story.append(Paragraph("RESUMO", style_section))
    story.append(Spacer(1, 0.10 * cm))
    story.append(resumo)

    append_fim(story)

    doc.build(
        story,
        onFirstPage=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    name_patient = getattr(patient, "name", "patient").replace("/", "-") if patient else "patient"
    filename = f"{getattr(recibo, 'number', 'recibo')}_{name_patient}.pdf"

    return pdf_bytes, filename


_code_item = _item_code
gerar_pdf_recibo = generate_receipt_pdf
