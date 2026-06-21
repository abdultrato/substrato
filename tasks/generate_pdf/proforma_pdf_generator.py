"""Geração do PDF de Fatura Proforma em layout institucional A5.

A proforma é um documento comercial de compromisso (não fiscal). Gerada em
duplicado (Original + Arquivo) quando enviada; em rascunho, apenas uma via.
Inclui aviso de não-fiscalidade, referência à cotação de origem (se existir),
condições de sinal/saldo previsto, observações e termos/condições.
"""

from decimal import Decimal
import io
import logging

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from .institutional_pdf_design import (
    InstitutionalNumberedCanvas as NumberedCanvas,
    PDF_BOTTOM_MARGIN,
    PDF_HEADER_TOP_MARGIN,
    PDF_MARGIN,
    _request_institutional_signatures,
    append_fim_institucional as append_fim,
    draw_institutional_corner_barcode,
    draw_institutional_signatures,
    FONT_INST,
    FONT_BOLD_INST,
    PDF_BODY_FONT_SIZE,
    PDF_BODY_LEADING,
    PDF_TITLE_FONT_SIZE,
    PDF_TITLE_LEADING,
    institutional_cell_paragraph as cell_paragraph,
    institutional_section_style as document_section_style,
    institutional_title_style as document_title_style,
    institutional_draw_line_full_width as draw_line_full_width,
    institutional_montar_bloco_identificacao as montar_bloco_identificacao,
    institutional_on_page as on_page,
    pdf_encryption,
    user_name_inst as user_name,
    user_primary_group_inst as user_primary_group,
)

PDF_LATER_TOP_MARGIN = 0.8 * cm

# Vias: proforma em duplicado (não triplicado — não é fiscal).
PROFORMA_VIAS = (
    ("ORIGINAL", "Via do Cliente"),
    ("DUPLICADO", "Via da Empresa"),
)

CURRENCY_NAMES = {
    "MZN": "Metical",
    "USD": "Dólar americano",
    "EUR": "Euro",
    "ZAR": "Rand",
}

logger = logging.getLogger(__name__)


def _fmt_date(value) -> str:
    if not value:
        return "—"
    try:
        return value.strftime("%d/%m/%Y")
    except Exception:
        return str(value)


def _fmt_dt(value) -> str:
    if not value:
        return "—"
    try:
        return value.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return str(value)


def _currency_label(code: str | None) -> str:
    normalized = (code or "MZN").strip().upper() or "MZN"
    name = CURRENCY_NAMES.get(normalized, normalized)
    return f"{name} ({normalized})"


def fmt_money(value) -> str:
    try:
        value = Decimal(str(value)).quantize(Decimal("0.01"))
    except Exception:
        value = Decimal("0.00")
    return f"{value:,.2f}".replace(",", " ")


def fmt_quant(value) -> str:
    try:
        value = Decimal(str(value))
    except Exception:
        value = Decimal("1.00")
    return f"{value.normalize():f}".replace(".", ",")


def fmt_percent(value) -> str:
    try:
        value = Decimal(str(value))
    except Exception:
        value = Decimal("0.00")
    return f"{value:,.2f}%".replace(",", " ")


def generate_proforma_pdf(proforma, request=None) -> tuple[bytes, str]:
    """Gera o PDF A5 da fatura proforma em duplicado (Original / Arquivo).

    Retorna ``(bytes, filename)``.
    """
    buffer = io.BytesIO()
    page_width, page_height = A5

    left_margin = PDF_MARGIN
    right_margin = PDF_MARGIN
    top_margin = PDF_HEADER_TOP_MARGIN
    bottom_margin = PDF_BOTTOM_MARGIN
    usable_width = page_width - (left_margin + right_margin)

    doc = BaseDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = True

    # ── Identificadores de máquina ──────────────────────────────────────────
    patient = getattr(proforma, "patient", None)
    created_by = getattr(proforma, "created_by", None)

    try:
        doc.barcode_value = (
            f"PAC:{getattr(patient, 'custom_id', '')}|PRO:{getattr(proforma, 'custom_id', '')}"
        )
    except Exception:
        doc.barcode_value = None

    try:
        doc.qr_url = None
        if request is not None:
            from django.urls import reverse
            try:
                doc.qr_url = request.build_absolute_uri(
                    reverse("api_v1:cotacoes:proforma-pdf", args=[proforma.pk])
                )
            except Exception:
                pass
    except Exception:
        pass

    # ── Cabeçalho personalizado (configuração do tenant) ────────────────────
    try:
        config = getattr(getattr(proforma, "tenant", None), "configuracao", None)
    except Exception:
        config = None

    if config is not None:
        ident_bits = []
        if getattr(config, "nuit", ""):
            ident_bits.append(f"NUIT: {config.nuit}")
        if getattr(config, "license_number", ""):
            ident_bits.append(f"Alvará: {config.license_number}")

        contact_bits = []
        if getattr(config, "fiscal_phone", ""):
            contact_bits.append(f"Tel: {config.fiscal_phone}")
        if getattr(config, "fiscal_email", ""):
            contact_bits.append(str(config.fiscal_email))

        header_sublines = []
        if ident_bits:
            header_sublines.append(" • ".join(ident_bits))
        if getattr(config, "fiscal_address", ""):
            header_sublines.append(str(config.fiscal_address).replace("\n", " "))
        if contact_bits:
            header_sublines.append(" • ".join(contact_bits))

        header_title = (
            getattr(config, "legal_name", "")
            or getattr(getattr(proforma, "tenant", None), "name", "")
            or ""
        ).strip()
        if header_title:
            doc.header_title = header_title
        if header_sublines:
            doc.header_lines = header_sublines[:3]

    currency_code = getattr(config, "currency", None) if config is not None else None
    currency_code = currency_code or getattr(proforma, "currency", "MZN") or "MZN"

    # ── Estilos ─────────────────────────────────────────────────────────────
    style_title = document_title_style("HeadingPro")
    style_title.alignment = TA_LEFT
    style_section = document_section_style("SectionPro")

    via_style = ParagraphStyle(
        "ProformaVia",
        fontName=FONT_BOLD_INST,
        fontSize=PDF_BODY_FONT_SIZE + 1,
        leading=PDF_BODY_LEADING + 2,
        alignment=TA_RIGHT,
        textColor=colors.darkblue,
    )
    notice_style = ParagraphStyle(
        "ProformaNotice",
        fontName=FONT_INST,
        fontSize=max(PDF_BODY_FONT_SIZE - 1, 6),
        leading=max(PDF_BODY_LEADING - 1, 7),
        alignment=TA_CENTER,
        textColor=colors.grey,
    )
    entity_style = ParagraphStyle(
        "ProformaEntity",
        fontName=FONT_INST,
        fontSize=max(PDF_BODY_FONT_SIZE - 1, 6),
        leading=max(PDF_BODY_LEADING - 1, 8),
        alignment=TA_LEFT,
        textColor=colors.black,
    )
    num_header_style = ParagraphStyle(
        "ProNumHeader",
        fontName=FONT_BOLD_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_RIGHT,
    )
    num_style = ParagraphStyle(
        "ProNumCell",
        fontName=FONT_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_RIGHT,
    )
    notes_style = ParagraphStyle(
        "ProNotes",
        fontName=FONT_INST,
        fontSize=max(PDF_BODY_FONT_SIZE - 1, 7),
        leading=max(PDF_BODY_LEADING - 1, 9),
        alignment=TA_LEFT,
        textColor=colors.HexColor("#444444"),
    )

    def num_header(text):
        return Paragraph(text, num_header_style)

    def num_cell(text):
        return Paragraph("" if text is None else str(text), num_style)

    # ── Dados (calculados uma vez) ───────────────────────────────────────────
    patient_name = (getattr(patient, "name", "") or "—") if patient else "—"

    professional_group = user_primary_group(created_by)
    professional_name = user_name(created_by)

    status_display = dict(
        (s.value, s.label) for s in type(proforma).Status
    ).get(proforma.status, proforma.status)

    id_left_lines = [f"<b>Cliente:</b> {patient_name}"]
    id_right_lines = [
        f"Emissão: {_fmt_date(proforma.issue_date)}",
        f"Validade: {_fmt_date(proforma.expiry_date)}",
        f"{professional_group}: {professional_name}",
        f"Estado: {status_display}",
    ]

    # Dados do cliente fiscal
    fc_name = (
        getattr(proforma, "fiscal_client_name", "")
        or (getattr(patient, "name", "") if patient else "")
        or "—"
    )
    fc_nuit = getattr(proforma, "fiscal_client_nuit", "") or ""
    fc_address = getattr(proforma, "fiscal_client_address", "") or ""
    fc_bits = [f"<b>Destinatário:</b> {fc_name}"]
    if fc_nuit:
        fc_bits.append(f"NUIT: {fc_nuit}")
    if fc_address:
        fc_bits.append(fc_address.replace("\n", " "))
    fc_line = " • ".join(fc_bits)

    # Cotação de origem
    quotation = getattr(proforma, "quotation", None)
    quotation_ref = ""
    if quotation:
        q_num = getattr(quotation, "quotation_number", "") or getattr(quotation, "custom_id", "") or ""
        if q_num:
            quotation_ref = f"Cotação de origem: {q_num}"

    # Moeda
    currency_line = f"<b>Moeda:</b> {_currency_label(currency_code)}"
    if quotation_ref:
        currency_line += f" • {quotation_ref}"

    # Itens
    items = list(proforma.items.all())

    # Totais
    ZERO = Decimal("0.00")
    subtotal = getattr(proforma, "subtotal", ZERO) or ZERO
    discount_total = getattr(proforma, "discount_total", ZERO) or ZERO
    tax_total = getattr(proforma, "tax_total", ZERO) or ZERO
    grand_total = getattr(proforma, "grand_total", ZERO) or ZERO
    deposit_required = getattr(proforma, "deposit_required", ZERO) or ZERO
    balance_due = getattr(proforma, "balance_due", ZERO) or ZERO

    deposit_type = getattr(proforma, "deposit_type", "NONE")
    deposit_label = ""
    if deposit_type != "NONE" and deposit_required > ZERO:
        deposit_pct = getattr(proforma, "deposit_percentage", ZERO) or ZERO
        if deposit_type == "PERCENTAGE" and deposit_pct > ZERO:
            deposit_label = f"Sinal ({fmt_percent(deposit_pct)})"
        else:
            deposit_label = "Sinal (valor fixo)"

    notes = (getattr(proforma, "notes", "") or "").strip()
    terms = (getattr(proforma, "terms_and_conditions", "") or "").strip()

    # ── Composição de uma via ────────────────────────────────────────────────
    is_draft = getattr(proforma, "status", None) == "DRAFT"
    title_prefix = "RASCUNHO DE PROFORMA" if is_draft else "FATURA PROFORMA"
    doc_id = getattr(proforma, "proforma_number", "") or getattr(proforma, "custom_id", "—")

    def _make_items_header():
        return [
            cell_paragraph("Descrição", is_bold=True),
            num_header("Qtd"),
            num_header("Preço un."),
            num_header("Desc."),
            num_header("Imposto"),
            num_header("Total"),
        ]

    def _compose_via(via_name: str | None = None, via_dest: str | None = None) -> list:
        body: list = []

        if via_name and via_dest:
            body.append(Paragraph(f"{via_name} — {via_dest}", via_style))
            body.append(Spacer(1, 0.2 * cm))

        # Aviso de não-fiscalidade
        body.append(
            Paragraph(
                "DOCUMENTO COMERCIAL — NÃO É DOCUMENTO FISCAL",
                notice_style,
            )
        )
        body.append(Spacer(1, 0.12 * cm))

        # Título e número
        body.append(Paragraph(f"{title_prefix} N.º {doc_id}", style_title))
        body.append(Spacer(1, 0.18 * cm))

        # Bloco de identificação
        body.append(
            montar_bloco_identificacao(
                usable_width=usable_width,
                left_lines=list(id_left_lines),
                right_lines=list(id_right_lines),
                left_ratio=0.5,
            )
        )
        body.append(Spacer(1, 0.15 * cm))
        body.append(HRFlowable(width="100%", thickness=0.6, color=colors.darkblue))
        body.append(Spacer(1, 0.1 * cm))

        # Cliente fiscal + moeda
        body.append(Paragraph(fc_line, entity_style))
        body.append(Spacer(1, 0.05 * cm))
        body.append(Paragraph(currency_line, entity_style))
        body.append(Spacer(1, 0.15 * cm))

        # Tabela de itens
        body.append(Paragraph("Itens", style_section))
        body.append(Spacer(1, 0.1 * cm))

        rows = [_make_items_header()]
        if items:
            for item in items:
                rows.append([
                    cell_paragraph(getattr(item, "description", "") or "—"),
                    num_cell(fmt_quant(getattr(item, "quantity", 1))),
                    num_cell(fmt_money(getattr(item, "unit_price", ZERO))),
                    num_cell(fmt_money(getattr(item, "discount_amount", ZERO))),
                    num_cell(fmt_money(getattr(item, "tax_amount", ZERO))),
                    num_cell(fmt_money(getattr(item, "line_total", ZERO))),
                ])
        else:
            rows.append([cell_paragraph("Nenhum item.", is_bold=False), "", "", "", "", ""])

        items_table = Table(
            rows,
            colWidths=[
                usable_width * 0.38,
                usable_width * 0.10,
                usable_width * 0.14,
                usable_width * 0.13,
                usable_width * 0.13,
                usable_width * 0.12,
            ],
            repeatRows=1,
        )
        items_table.setStyle(
            TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 1), (-1, 1), 0.1 * cm),
                ("LINEABOVE", (0, 0), (-1, 0), 0.6, colors.darkblue),
                ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.darkblue),
                ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.grey),
            ])
        )
        body.append(items_table)
        body.append(Spacer(1, 0.15 * cm))

        # Totais
        totais_rows = [
            [cell_paragraph("Subtotal:"), num_cell(fmt_money(subtotal))],
        ]
        if discount_total > ZERO:
            totais_rows.append(
                [cell_paragraph("Desconto total:"), num_cell(f"- {fmt_money(discount_total)}")]
            )
        if tax_total > ZERO:
            totais_rows.append(
                [cell_paragraph("Imposto total:"), num_cell(fmt_money(tax_total))]
            )
        totais_rows.append(
            [cell_paragraph("TOTAL GERAL:", is_bold=True), num_cell(fmt_money(grand_total))]
        )
        if deposit_required > ZERO:
            totais_rows.append(
                [cell_paragraph(deposit_label or "Sinal:"), num_cell(fmt_money(deposit_required))]
            )
            totais_rows.append(
                [cell_paragraph("Saldo previsto:"), num_cell(fmt_money(balance_due))]
            )

        totais_table = Table(
            totais_rows,
            colWidths=[usable_width * 0.60, usable_width * 0.40],
        )
        totais_table.setStyle(
            TableStyle([
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.grey),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, colors.darkblue)
                if not (deposit_required > ZERO)
                else ("LINEABOVE", (0, -3), (-1, -3), 0.8, colors.darkblue),
            ])
        )
        body.append(totais_table)
        body.append(Spacer(1, 0.15 * cm))

        # Notas e termos
        if notes:
            body.append(Paragraph("Observações", style_section))
            body.append(Spacer(1, 0.06 * cm))
            body.append(Paragraph(notes.replace("\n", "<br/>"), notes_style))
            body.append(Spacer(1, 0.12 * cm))

        if terms:
            body.append(Paragraph("Termos e Condições", style_section))
            body.append(Spacer(1, 0.06 * cm))
            body.append(Paragraph(terms.replace("\n", "<br/>"), notes_style))
            body.append(Spacer(1, 0.12 * cm))

        append_fim(body)
        return body

    # ── Montagem das vias ────────────────────────────────────────────────────
    story: list = []
    if is_draft:
        story.append(NextPageTemplate("later"))
        story.extend(_compose_via())
    else:
        for idx, (via_name, via_dest) in enumerate(PROFORMA_VIAS):
            if idx == 0:
                story.append(NextPageTemplate("later"))
            else:
                story.append(NextPageTemplate("first"))
                story.append(PageBreak())
                story.append(NextPageTemplate("later"))
            story.extend(_compose_via(via_name, via_dest))

    # ── Frames e page templates ──────────────────────────────────────────────
    frame_first = Frame(
        left_margin,
        bottom_margin,
        usable_width,
        page_height - top_margin - bottom_margin,
        id="first",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    frame_later = Frame(
        left_margin,
        bottom_margin,
        usable_width,
        page_height - PDF_LATER_TOP_MARGIN - bottom_margin,
        id="later",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )

    def _on_first(canvas_obj, doc_):
        on_page(canvas_obj, doc_, created_by)
        draw_line_full_width(canvas_obj, doc_)

    def _on_later(canvas_obj, doc_):
        draw_institutional_corner_barcode(canvas_obj, doc_)
        _request_institutional_signatures(
            canvas_obj, doc_, created_by, draw_institutional_signatures
        )
        draw_line_full_width(canvas_obj, doc_)

    doc.addPageTemplates([
        PageTemplate(id="first", frames=[frame_first], onPage=_on_first),
        PageTemplate(id="later", frames=[frame_later], onPage=_on_later),
    ])

    doc.build(story, canvasmaker=NumberedCanvas)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    safe_name = (getattr(patient, "name", "") or "proforma").replace("/", "-")
    filename = f"{doc_id}_{safe_name}.pdf"
    return pdf_bytes, filename


gerar_pdf_proforma = generate_proforma_pdf
