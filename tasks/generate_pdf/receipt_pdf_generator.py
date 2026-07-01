"""Geração do PDF de recibo associado a pagamentos de faturas."""

from decimal import Decimal
import io
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .institutional_pdf_design import (
    FONT_BOLD_INST as FONT_BOLD,
    InstitutionalNumberedCanvas as NumberedCanvas,
    PDF_BOTTOM_MARGIN,
    PDF_HEADER_TOP_MARGIN,
    PDF_MARGIN,
    append_fim,
    bold_inst as bold,
    institutional_cell_paragraph as cell_paragraph,
    institutional_section_style as document_section_style,
    institutional_title_style as document_title_style,
    institutional_draw_line_full_width as draw_line_full_width,
    institutional_user_identity,
    institutional_montar_bloco_identificacao as montar_bloco_identificacao,
    institutional_on_page as on_page,
    pdf_encryption,
)
from .invoice_pdf_generator import IVA_LEGAL_BASE, IVA_NOTA_SAUDE

logger = logging.getLogger(__name__)

CURRENCY_NAMES = {
    "MZN": "Metical",
    "USD": "Dólar americano",
    "EUR": "Euro",
    "ZAR": "Rand",
}


def _currency_label(code: str | None) -> str:
    normalized = (code or "MZN").strip().upper() or "MZN"
    name = CURRENCY_NAMES.get(normalized, normalized)
    return f"{name} ({normalized})"


def _formatar_dt(value) -> str:
    """Formata data/hora para o padrão institucional dos PDFs."""
    if not value:
        return "—"
    try:
        return value.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return str(value)


def _as_money(v) -> str:
    if v is None:
        return "—"
    try:
        return f"{Decimal(str(v)):,.2f}".replace(",", " ")
    except Exception:
        return str(v)


def _payment_identifier(payment) -> str:
    """Identificador legível do pagamento (custom_id pode ser None na BD)."""
    if not payment:
        return "—"
    custom_id = getattr(payment, "custom_id", None)
    if custom_id:
        return str(custom_id)
    pk = getattr(payment, "pk", None)
    return str(pk) if pk else "—"


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

    left_margin = PDF_MARGIN
    right_margin = PDF_MARGIN
    top_margin = PDF_HEADER_TOP_MARGIN
    bottom_margin = PDF_BOTTOM_MARGIN

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

    # Todos os pagamentos confirmados da fatura — o recibo deve refletir a
    # mesma liquidação que a fatura (que pode ter vários métodos), não apenas
    # o pagamento diretamente associado a este recibo.
    pagamentos_fatura = []
    if invoice is not None:
        try:
            pagamentos_fatura = list(
                invoice.pagamentos.filter(deleted=False)
                .select_related("insurer")
                .order_by("paid_at", "pk")
            )
        except Exception:
            pagamentos_fatura = []
    if payment is not None and payment not in pagamentos_fatura:
        pagamentos_fatura.append(payment)
    patient = getattr(invoice, "patient", None) if invoice else None
    config = getattr(getattr(invoice, "tenant", None), "configuracao", None) if invoice else None
    currency_code = getattr(config, "currency", "") if config is not None else ""

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
    def _metodo_label(pag) -> str:
        try:
            return pag.get_method_display()
        except Exception:
            return getattr(pag, "method", "") or ""

    # Lista de todos os métodos usados na liquidação (sem repetições, por ordem
    # de pagamento): ex. "Seguro de Saúde, Dinheiro, Transferência bancária".
    metodos_lista: list[str] = []
    for pag in pagamentos_fatura:
        rotulo = _metodo_label(pag)
        if rotulo and rotulo not in metodos_lista:
            metodos_lista.append(rotulo)
    methods_txt = ", ".join(metodos_lista)

    status_txt = ""
    paid_at = None
    if payment:
        try:
            status_txt = payment.get_status_display()
        except Exception:
            status_txt = getattr(payment, "status", "") or ""
        paid_at = getattr(payment, "paid_at", None)

    technician_texto = institutional_user_identity(user_documento)

    right_lines = [
        f"{bold('Recibo')}: {getattr(recibo, 'number', '—')}",
        f"{bold('Fatura')}: {getattr(invoice, 'custom_id', '—') if invoice else '—'}",
        f"{bold('Pagamento')}: {_payment_identifier(payment)}",
        f"{bold('Métodos' if len(metodos_lista) > 1 else 'Método')}: {methods_txt or '—'}",
        f"{bold('Status')}: {status_txt or '—'}",
        f"{bold('Tipo de moeda')}: {_currency_label(currency_code)}",
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
                cell_paragraph(f"{price_unit:,.2f}".replace(",", " ")),
                cell_paragraph(f"{total_linha:,.2f}".replace(",", " ")),
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
    # PAGAMENTOS (mesma liquidação da fatura — pode haver vários métodos)
    # ==========================
    if pagamentos_fatura:
        story.append(Paragraph("PAGAMENTOS", style_section))
        story.append(Spacer(1, 0.12 * cm))

        pag_data = [
            [
                cell_paragraph("Data", is_bold=True),
                cell_paragraph("Método", is_bold=True),
                cell_paragraph("Referência", is_bold=True),
                cell_paragraph("Operador", is_bold=True),
                cell_paragraph("Estado", is_bold=True),
                cell_paragraph("Valor", is_bold=True),
                cell_paragraph("Troco", is_bold=True),
            ]
        ]

        for pag in pagamentos_fatura:
            try:
                metodo = pag.get_method_display()
            except Exception:
                metodo = getattr(pag, "method", "") or "—"
            try:
                estado = pag.get_status_display()
            except Exception:
                estado = getattr(pag, "status", "") or "—"

            referencia = (
                getattr(pag, "external_reference", "")
                or getattr(pag, "authorization_number", "")
                or "—"
            )
            operador = institutional_user_identity(getattr(pag, "created_by", None)) or "—"
            valor = getattr(pag, "value", Decimal("0.00")) or Decimal("0.00")
            troco = getattr(pag, "change_amount", Decimal("0.00")) or Decimal("0.00")

            pag_data.append(
                [
                    cell_paragraph(_formatar_dt(getattr(pag, "paid_at", None) or getattr(pag, "created_at", None))),
                    cell_paragraph(metodo),
                    cell_paragraph(str(referencia)),
                    cell_paragraph(str(operador)),
                    cell_paragraph(estado),
                    cell_paragraph(_as_money(valor)),
                    cell_paragraph(_as_money(troco)),
                ]
            )

        pag_table = Table(
            pag_data,
            colWidths=[
                usable_width * 0.16,
                usable_width * 0.15,
                usable_width * 0.16,
                usable_width * 0.17,
                usable_width * 0.12,
                usable_width * 0.13,
                usable_width * 0.11,
            ],
            repeatRows=1,
        )
        pag_table.setStyle(
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
        story.append(pag_table)
        story.append(Spacer(1, 0.18 * cm))

    # ==========================
    # RESUMO
    # ==========================
    total_sem_iva = getattr(invoice, "subtotal", None) if invoice else None
    total_iva = getattr(invoice, "vat_amount", None) if invoice else None
    total_com_iva = getattr(invoice, "total_a_pagar", None) if invoice else None
    if total_com_iva is None:
        total_com_iva = getattr(invoice, "total", None) if invoice else None

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

    # ==========================
    # NOTA LEGAL DO IVA (cuidados de saúde — taxa reduzida)
    # ==========================
    try:
        iva_total = Decimal(str(total_iva or 0))
    except Exception:
        iva_total = Decimal("0.00")
    nota_iva = IVA_NOTA_SAUDE if iva_total > 0 else f"Isento/não sujeito a IVA nos termos do {IVA_LEGAL_BASE}."
    story.append(Spacer(1, 0.18 * cm))
    story.append(cell_paragraph(nota_iva))

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
