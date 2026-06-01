"""Geração do PDF de fatura (invoice) em layout institucional A5."""

from decimal import Decimal
import io
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from apps.billing.models.invoice_items import InvoiceItem

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
    institutional_montar_bloco_identificacao as montar_bloco_identificacao,
    institutional_on_page as on_page,
    pdf_encryption,
    user_name_inst as user_name,
    user_primary_group_inst as user_primary_group,
)

logger = logging.getLogger(__name__)


def _format_request_date(request):
    """Formata data/hora da requisição associada à fatura."""
    if not request:
        return "—"

    date = getattr(request, "created_at", None) or getattr(request, "created_at", None)
    if not date:
        return "—"

    try:
        return date.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return "—"


def _exam_code(exam):
    """Resolve código primário de exame com fallback para `custom_id`."""
    return getattr(exam, "code", "") or getattr(exam, "custom_id", "") or ""


_code_exam = _exam_code


def _resolve_document_user(invoice, request):
    """Resolve o utilizador responsável exibido no cabeçalho da fatura."""
    return (
        getattr(invoice, "created_by", None)
        or getattr(request, "created_by", None)
        or getattr(request, "analyst", None)
    )


def generate_invoice_pdf(invoice, request=None) -> tuple[bytes, str]:
    """
    Gera o PDF A5 da fatura.

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
    doc.include_signatures = True

    story = []

    # ==========================
    # DADOS BASE
    # ==========================
    patient = getattr(invoice, "patient", None)
    request = getattr(invoice, "request", None)
    user_documento = _resolve_document_user(invoice, request)

    # Código de barras no header (repete em todas páginas)
    try:
        doc.barcode_value = f"PAC:{getattr(patient, 'custom_id', '')}|FAT:{getattr(invoice, 'custom_id', '')}"
    except Exception:
        doc.barcode_value = None

    # ==========================
    # ESTILOS
    # ==========================
    style_title = document_title_style("HeadingFat")
    style_section = document_section_style("section_fat")

    # ==========================
    # CABEÇALHO DO DOCUMENTO
    # ==========================
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("FATURA", style_title))
    story.append(Spacer(1, 0.2 * cm))

    # ==========================
    # LINK DO PDF (opcional)
    # ==========================
    link_invoice: str | None = None
    try:
        if request:
            from django.urls import reverse

            link_invoice = request.build_absolute_uri(reverse("frontend:invoice_pdf", args=[invoice.custom_id]))
    except Exception:
        link_invoice = None

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

        origin_company = getattr(patient, "origin_company", None)
        requesting_company = getattr(request, "requesting_company", None) if request else None
        empresa_executora = getattr(request, "external_executing_company", None) if request else None
        if requesting_company:
            left_lines.append(f"{bold('Empresa solicitante')}: {getattr(requesting_company, 'name', '—')}")
        elif origin_company:
            left_lines.append(f"{bold('Empresa')}: {getattr(origin_company, 'name', '—')}")
        if empresa_executora:
            left_lines.append(f"{bold('Executora externa')}: {getattr(empresa_executora, 'name', '—')}")
    else:
        left_lines = [f"{bold('Paciente')}: —"]

    # ==========================
    # BLOCO DIREITA (FATURA)
    # ==========================
    professional_group = user_primary_group(user_documento)
    professional_name = user_name(user_documento)

    date_request = _format_request_date(request)

    right_lines = [
        f"{bold('Fatura')}: {getattr(invoice, 'custom_id', '—')}",
        f"{bold('Requisição')}: {getattr(request, 'custom_id', '—') if request else '—'}",
        f"{bold('Data')}: {date_request}",
        f"{bold(professional_group)}: {professional_name}",
        f"{bold('Estado')}: {getattr(invoice, 'status', '—')}",
    ]

    if link_invoice:
        right_lines.append(f"{bold('Link')}: <a href='{link_invoice}' color='blue'>{link_invoice}</a>")

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
    # ITENS DA FATURA
    # ==========================
    story.append(Paragraph("ITENS DA FATURA", style_section))
    story.append(Spacer(1, 0.12 * cm))

    itens = list(invoice.items.select_related("exam", "medical_exam").filter(deleted=False))
    subtotal_geral = Decimal("0.00")

    for item in itens:
        subtotal_geral += item.total_sem_iva or Decimal("0.00")

    section_defs = [
        ("Exames", lambda i: i.item_type == InvoiceItem.TipoItem.EXAME),
        ("Exames Médicos", lambda i: i.item_type == InvoiceItem.TipoItem.EXAME_MEDICO),
        (
            "Consultas",
            lambda i: i.item_type == InvoiceItem.TipoItem.AJUSTE
            and i.description
            and "consultation" in i.description.lower(),
        ),
        (
            "Procedimentos",
            lambda i: i.item_type
            in {
                InvoiceItem.TipoItem.PROCEDIMENTO_ITEM,
                InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL,
            },
        ),
        ("Medicação", lambda i: i.item_type == InvoiceItem.TipoItem.ITEM_VENDA),
    ]

    assigned = set()
    header = [
        cell_paragraph("Descrição", is_bold=True),
        cell_paragraph("Qtd", is_bold=True),
        cell_paragraph("Preço", is_bold=True),
        cell_paragraph("% IVA", is_bold=True),
        cell_paragraph("Valor IVA", is_bold=True),
        cell_paragraph("Subtotal (sem IVA)", is_bold=True),
    ]

    def fmt_money(value):
        try:
            value = Decimal(str(value)).quantize(Decimal("0.01"))
        except Exception:
            value = Decimal("0.00")
        return f"{value:,.2f} MZN".replace(",", " ")

    def fmt_quant(value):
        try:
            value = Decimal(str(value))
        except Exception:
            value = Decimal("1.00")
        return f"{value.normalize():f}".replace(".", ",")

    def fmt_percent(value):
        try:
            value = Decimal(str(value))
        except Exception:
            value = Decimal("0.00")
        return f"{value:,.2f}%".replace(",", " ")

    for label, predicate in section_defs:
        section_items = [item for item in itens if predicate(item)]
        for item in section_items:
            assigned.add(item.pk)
        if not section_items:
            continue

        story.append(Paragraph(label, style_section))
        story.append(Spacer(1, 0.08 * cm))

        rows = [header]
        for item in section_items:
            qtd = getattr(item, "quantity", Decimal("1.00")) or Decimal("1.00")
            price_unit = getattr(item, "unit_price", Decimal("0.00")) or Decimal("0.00")
            description = getattr(item, "description", None) or "—"
            percentual = getattr(item, "vat_percentage", Decimal("0.00")) or Decimal("0.00")
            value_iva = getattr(item, "vat_amount", Decimal("0.00")) or Decimal("0.00")
            subtotal_item = getattr(item, "total_sem_iva", Decimal("0.00")) or Decimal("0.00")

            rows.append(
                [
                    cell_paragraph(description),
                    cell_paragraph(fmt_quant(qtd)),
                    cell_paragraph(fmt_money(price_unit)),
                    cell_paragraph(fmt_percent(percentual)),
                    cell_paragraph(fmt_money(value_iva)),
                    cell_paragraph(fmt_money(subtotal_item)),
                ]
            )

        table = Table(
            rows,
            colWidths=[
                usable_width * 0.40,
                usable_width * 0.10,
                usable_width * 0.13,
                usable_width * 0.12,
                usable_width * 0.13,
                usable_width * 0.12,
            ],
        )
        table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.darkblue),
                ]
            )
        )
        story.append(KeepTogether(table))
        story.append(Spacer(1, 0.15 * cm))

    remaining = [item for item in itens if item.pk not in assigned]
    if remaining:
        story.append(Paragraph("Outros itens", style_section))
        story.append(Spacer(1, 0.08 * cm))
        rows = [header]
        for item in remaining:
            qtd = getattr(item, "quantity", Decimal("1.00")) or Decimal("1.00")
            price_unit = getattr(item, "unit_price", Decimal("0.00")) or Decimal("0.00")
            description = getattr(item, "description", None) or "—"
            percentual = getattr(item, "vat_percentage", Decimal("0.00")) or Decimal("0.00")
            value_iva = getattr(item, "vat_amount", Decimal("0.00")) or Decimal("0.00")
            subtotal_item = getattr(item, "total_sem_iva", Decimal("0.00")) or Decimal("0.00")

            rows.append(
                [
                    cell_paragraph(description),
                    cell_paragraph(fmt_quant(qtd)),
                    cell_paragraph(fmt_money(price_unit)),
                    cell_paragraph(fmt_percent(percentual)),
                    cell_paragraph(fmt_money(value_iva)),
                    cell_paragraph(fmt_money(subtotal_item)),
                ]
            )

        table = Table(
            rows,
            colWidths=[
                usable_width * 0.40,
                usable_width * 0.10,
                usable_width * 0.13,
                usable_width * 0.12,
                usable_width * 0.13,
                usable_width * 0.12,
            ],
        )
        table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.darkblue),
                ]
            )
        )
        story.append(KeepTogether(table))
        story.append(Spacer(1, 0.15 * cm))

    if not itens:
        story.append(cell_paragraph("Nenhum item registrado.", is_bold=True))
        story.append(Spacer(1, 0.22 * cm))

    # ==========================
    # TOTAIS
    # ==========================
    subtotal_model = getattr(invoice, "subtotal", None)
    total_model = getattr(invoice, "total_a_pagar", None)
    if total_model is None:
        total_model = getattr(invoice, "total", None)
    iva_model = getattr(invoice, "vat_amount", None)

    def fmt_money(v):
        try:
            v = Decimal(str(v)).quantize(Decimal("0.01"))
        except Exception:
            v = Decimal("0.00")
        return f"{v:,.2f} MZN".replace(",", " ")

    subtotal_sem_iva = subtotal_model if subtotal_model is not None else subtotal_geral
    total_com_iva = total_model if total_model is not None else subtotal_sem_iva + (iva_model or Decimal("0.00"))
    value_total_iva = iva_model if iva_model is not None else max(total_com_iva - subtotal_sem_iva, Decimal("0.00"))
    total_a_pagar_com_iva = total_com_iva

    totais_date = [
        [
            cell_paragraph("Subtotal (sem IVA):", is_bold=True),
            cell_paragraph(fmt_money(subtotal_sem_iva)),
        ],
        [cell_paragraph("Valor total do IVA:", is_bold=True), cell_paragraph(fmt_money(value_total_iva))],
        [cell_paragraph("Total (com IVA):", is_bold=True), cell_paragraph(fmt_money(total_com_iva))],
        [
            cell_paragraph("TOTAL A PAGAR (com IVA):", is_bold=True),
            cell_paragraph(fmt_money(total_a_pagar_com_iva), is_bold=True),
        ]
    ]

    totais_table = Table(totais_date, colWidths=[usable_width * 0.60, usable_width * 0.40])
    totais_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, colors.darkblue),
            ]
        )
    )

    story.append(totais_table)
    story.append(Spacer(1, 0.15 * cm))

    # ==========================
    # QR CODE
    # ==========================
    if link_invoice:
        try:
            import qrcode
            from reportlab.platypus import Image as RLImage

            qr = qrcode.QRCode(box_size=4, border=1)
            qr.add_data(link_invoice)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")

            qr_buf = io.BytesIO()
            img.save(qr_buf, format="PNG")
            qr_buf.seek(0)

            story.append(Spacer(1, 0.12 * cm))
            story.append(cell_paragraph("QR Code para acesso rápido à invoice:"))
            story.append(Spacer(1, 0.08 * cm))
            story.append(RLImage(qr_buf, width=2.3 * cm, height=2.3 * cm))
        except Exception as e:
            logger.warning("Falha ao gerar QR Code: %s", e)

    append_fim(story)

    # ==========================
    # BUILD PDF A5
    # ==========================
    doc.build(
        story,
        onFirstPage=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    name_patient = getattr(patient, "name", "patient").replace("/", "-")
    filename = f"{invoice.custom_id}_{name_patient}.pdf"

    return pdf_bytes, filename


_formatar_date_request = _format_request_date
_resolver_user_documento = _resolve_document_user
gerar_pdf_invoice = generate_invoice_pdf
