"""Geração do PDF de fatura (invoice) em layout institucional A5.

Faturas emitidas são geradas em TRIPLICADO (Original / Duplicado /
Triplicado), à semelhança das instituições financeiras. Rascunhos geram apenas
uma via, sem identificação de Original/Duplicado/Triplicado. Inclui ainda a
nota legal do IVA (base: Código do IVA).
"""

from decimal import Decimal
import io
import logging

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
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

from apps.billing.models.invoice_items import InvoiceItem

from .institutional_pdf_design import (
    InstitutionalNumberedCanvas as NumberedCanvas,
    PDF_BOTTOM_MARGIN,
    PDF_HEADER_TOP_MARGIN,
    PDF_MARGIN,
    _request_institutional_signatures,
    append_fim,
    draw_institutional_corner_barcode,
    draw_institutional_signatures,
    FONT_INST,
    FONT_BOLD_INST,
    PDF_BODY_FONT_SIZE,
    PDF_BODY_LEADING,
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

# Margem superior das páginas a partir da 2.ª: sem letterhead, apenas um respiro.
PDF_LATER_TOP_MARGIN = 0.8 * cm

# Base legal do IVA em Moçambique (mantida curta na fatura). Ajuste aqui caso a
# referência legal aplicável mude.
IVA_LEGAL_BASE = "Código do IVA (Lei n.º 13/2022, de 23 de Dezembro)"

# Taxa reduzida de IVA aplicável à prestação de cuidados de saúde (serviços e
# produtos), nos termos do Código do IVA (Lei n.º 13/2022). Ajustar aqui caso a
# taxa legal mude.
IVA_TAXA_REDUZIDA_SAUDE = Decimal("5")
IVA_NOTA_SAUDE = (
    "Prestação de cuidados de saúde sujeita à taxa reduzida de IVA de "
    f"{IVA_TAXA_REDUZIDA_SAUDE.normalize()}%, nos termos do {IVA_LEGAL_BASE}."
)

# Vias do documento (padrão triplicado das instituições financeiras).
INVOICE_VIAS = (
    ("ORIGINAL", "Via do Cliente"),
    ("DUPLICADO", "Via do Arquivo"),
    ("TRIPLICADO", "Via da Contabilidade"),
)

CURRENCY_NAMES = {
    "MZN": "Metical",
    "USD": "Dólar americano",
    "EUR": "Euro",
    "ZAR": "Rand",
}

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


def _currency_label(code: str | None) -> str:
    normalized = (code or "MZN").strip().upper() or "MZN"
    name = CURRENCY_NAMES.get(normalized, normalized)
    return f"{name} ({normalized})"


def _resolve_document_user(invoice, request):
    """Resolve o utilizador responsável exibido no cabeçalho da fatura."""
    return (
        getattr(invoice, "created_by", None)
        or getattr(request, "created_by", None)
        or getattr(request, "analyst", None)
    )


def _iva_legal_note(itens, value_total_iva: Decimal) -> str:
    """Nota curta de IVA + base legal, conforme as taxas presentes nos itens."""
    rates = set()
    for item in itens:
        try:
            rate = Decimal(str(getattr(item, "vat_percentage", 0) or 0))
        except Exception:
            rate = Decimal("0")
        if rate > 0:
            rates.add(rate)

    if not rates or (value_total_iva or Decimal("0.00")) <= Decimal("0.00"):
        return f"Isento/não sujeito a IVA nos termos do {IVA_LEGAL_BASE}."

    # Cuidados de saúde: taxa reduzida única (5%) → nota legal específica.
    if rates == {IVA_TAXA_REDUZIDA_SAUDE}:
        return IVA_NOTA_SAUDE

    if len(rates) == 1:
        taxa = f"à taxa de {next(iter(rates)).normalize()}%"
    else:
        taxa = "às taxas legais aplicáveis"
    return f"IVA incluído {taxa}, liquidado nos termos do {IVA_LEGAL_BASE}."


def generate_invoice_pdf(invoice, request=None) -> tuple[bytes, str]:
    """
    Gera o PDF A5 da fatura em triplicado (Original/Duplicado/Triplicado).

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

    # ==========================
    # DADOS BASE (uma vez)
    # ==========================
    patient = getattr(invoice, "patient", None)
    request = getattr(invoice, "request", None)
    user_documento = _resolve_document_user(invoice, request)

    # Código de barras no header (repete em todas páginas)
    try:
        doc.barcode_value = f"PAC:{getattr(patient, 'custom_id', '')}|FAT:{getattr(invoice, 'custom_id', '')}"
    except Exception:
        doc.barcode_value = None

    # QR aponta para a página pública de validação (hash + estado + dados mínimos).
    try:
        if not getattr(invoice, "verification_hash", "") and getattr(invoice, "pk", None):
            invoice.ensure_verification_hash()
            type(invoice).all_objects.filter(pk=invoice.pk).update(verification_hash=invoice.verification_hash)
        verification_path = invoice.verification_path()
        if request is not None:
            doc.qr_url = request.build_absolute_uri(verification_path)
        else:
            from django.conf import settings as _settings

            base = (getattr(_settings, "PUBLIC_BASE_URL", "") or getattr(_settings, "SITE_URL", "") or "").rstrip("/")
            doc.qr_url = (base + verification_path) if base else verification_path
    except Exception:
        pass

    # ==========================
    # ESTILOS (uma vez)
    # ==========================
    style_title = document_title_style("HeadingFat")
    style_title.alignment = TA_LEFT  # Ordem da fatura alinhada à esquerda.
    style_section = document_section_style("section_fat")
    via_style = ParagraphStyle(
        "InvoiceVia",
        fontName=FONT_BOLD_INST,
        fontSize=PDF_BODY_FONT_SIZE + 1,
        leading=PDF_BODY_LEADING + 2,
        alignment=TA_RIGHT,
        textColor=colors.darkblue,
    )
    iva_note_style = ParagraphStyle(
        "InvoiceIvaNote",
        fontName=FONT_INST,
        fontSize=max(PDF_BODY_FONT_SIZE - 1, 6),
        leading=max(PDF_BODY_LEADING - 1, 7),
        alignment=TA_LEFT,
        textColor=colors.grey,
    )
    entity_style = ParagraphStyle(
        "InvoiceEntity",
        fontName=FONT_INST,
        fontSize=max(PDF_BODY_FONT_SIZE - 1, 6),
        leading=max(PDF_BODY_LEADING - 1, 8),
        alignment=TA_LEFT,
        textColor=colors.black,
    )
    num_header_style = ParagraphStyle(
        "NumHeader",
        fontName=FONT_BOLD_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_RIGHT,
    )
    num_style = ParagraphStyle(
        "NumCell",
        fontName=FONT_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_RIGHT,
    )

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
    # BLOCOS DE IDENTIFICAÇÃO (dados — uma vez)
    # ==========================
    # Paciente: apenas o nome (os dados detalhados do pagante vão no bloco fiscal
    # e na secção de pagamento/liquidação).
    patient_name = (getattr(patient, "name", "") or "—") if patient else "—"
    id_left_lines = [f"<b>Paciente:</b> {patient_name}"]

    professional_group = user_primary_group(user_documento)
    professional_name = user_name(user_documento)
    date_request = _format_request_date(request)

    id_right_lines = [
        f"Data: {date_request}",
        f"{professional_group}: {professional_name}",
        f"Estado: {getattr(invoice, 'status', '—')}",
    ]
    if link_invoice:
        id_right_lines.append(f"Link: <a href='{link_invoice}' color='blue'>{link_invoice}</a>")

    # ==========================
    # ITENS (dados — uma vez)
    # ==========================
    itens = list(invoice.items.select_related("exam", "medical_exam").filter(deleted=False))
    subtotal_geral = Decimal("0.00")
    for item in itens:
        subtotal_geral += item.total_sem_iva or Decimal("0.00")

    TipoItem = InvoiceItem.TipoItem

    TYPE_LABELS = {
        TipoItem.EXAME: ("Exame laboratorial", "Exames laboratoriais"),
        TipoItem.EXAME_MEDICO: ("Exame médico", "Exames médicos"),
        TipoItem.CONSULTATION: ("Consulta", "Consultas"),
        TipoItem.PROCEDIMENTO_ITEM: ("Serviço de enfermagem", "Serviços de enfermagem"),
        TipoItem.PROCEDIMENTO_MATERIAL: ("Material de enfermagem", "Materiais de enfermagem"),
        TipoItem.ITEM_VENDA: ("Medicamento", "Medicamentos"),
        TipoItem.AJUSTE: ("Ajuste manual", "Ajustes manuais"),
    }

    def _label(singular, plural, count):
        return singular if count == 1 else plural

    section_defs = [
        ("Exame laboratorial", "Exames laboratoriais", lambda i: i.item_type == TipoItem.EXAME),
        ("Exame médico", "Exames médicos", lambda i: i.item_type == TipoItem.EXAME_MEDICO),
        (
            "Consulta",
            "Consultas",
            lambda i: i.item_type == TipoItem.CONSULTATION
            or (
                i.item_type == TipoItem.AJUSTE
                and i.description
                and "consultation" in i.description.lower()
            ),
        ),
        (
            "Procedimento",
            "Procedimentos",
            lambda i: i.item_type
            in {
                TipoItem.PROCEDIMENTO_ITEM,
                TipoItem.PROCEDIMENTO_MATERIAL,
            },
        ),
        ("Medicamento", "Medicamentos", lambda i: i.item_type == TipoItem.ITEM_VENDA),
    ]

    def num_header(text):
        return Paragraph(text, num_header_style)

    def num_cell(text):
        return Paragraph("" if text is None else str(text), num_style)

    def fmt_money(value):
        try:
            value = Decimal(str(value)).quantize(Decimal("0.01"))
        except Exception:
            value = Decimal("0.00")
        return f"{value:,.2f}".replace(",", " ")

    def fmt_money_plain(value):
        try:
            value = Decimal(str(value)).quantize(Decimal("0.01"))
        except Exception:
            value = Decimal("0.00")
        return f"{value:,.2f}".replace(",", " ")

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

    def _make_header():
        return [
            cell_paragraph("Descrição", is_bold=True),
            num_header("Qtd"),
            num_header("Preço"),
            num_header("% IVA"),
            num_header("#IVA"),
            num_header("Subtotal"),
        ]

    # ==========================
    # TOTAIS (dados — uma vez)
    # ==========================
    subtotal_model = getattr(invoice, "subtotal", None)
    total_model = getattr(invoice, "total_a_pagar", None)
    if total_model is None:
        total_model = getattr(invoice, "total", None)
    iva_model = getattr(invoice, "vat_amount", None)

    subtotal_sem_iva = subtotal_model if subtotal_model is not None else subtotal_geral
    total_com_iva = total_model if total_model is not None else subtotal_sem_iva + (iva_model or Decimal("0.00"))
    value_total_iva = iva_model if iva_model is not None else max(total_com_iva - subtotal_sem_iva, Decimal("0.00"))
    total_a_pagar_com_iva = total_com_iva

    iva_legal_note = _iva_legal_note(itens, value_total_iva)

    # ==========================
    # PAGAMENTO / LIQUIDAÇÃO (dados — uma vez)
    # ==========================
    method_labels: dict = {}
    status_labels: dict = {}
    payments: list = []
    receipts: list = []
    confirmed_paid = Decimal("0.00")
    try:
        from apps.payments.models.payment import Payment as _Payment

        method_labels = dict(_Payment.Method.choices)
        status_labels = dict(_Payment.Status.choices)
        if getattr(invoice, "pk", None):
            payments = list(invoice.pagamentos.filter(deleted=False).select_related("created_by"))
            receipts = list(invoice.recibos.all())
            confirmed_paid = invoice.confirmed_paid_amount() or Decimal("0.00")
    except Exception:
        method_labels, status_labels, payments, receipts = {}, {}, [], []
        confirmed_paid = Decimal("0.00")

    outstanding = (total_com_iva or Decimal("0.00")) - (confirmed_paid or Decimal("0.00"))
    if outstanding < Decimal("0.00"):
        outstanding = Decimal("0.00")
    receipt_numbers = ", ".join(
        str(getattr(r, "number", "") or "") for r in receipts if getattr(r, "number", "")
    ) or "—"

    inv_status = getattr(invoice, "status", None)
    if inv_status == "PAGA" or (confirmed_paid >= (total_com_iva or Decimal("0.00")) and (total_com_iva or Decimal("0.00")) > Decimal("0.00")):
        settle_label = "PAGA / LIQUIDADA"
    elif confirmed_paid > Decimal("0.00"):
        settle_label = "PARCIALMENTE PAGA"
    else:
        settle_label = "POR LIQUIDAR"

    def _fmt_dt(value):
        try:
            return value.strftime("%d/%m/%Y %H:%M")
        except Exception:
            return "—"

    # ==========================
    # IDENTIDADE FISCAL DA ENTIDADE → CABEÇALHO (letterhead)
    # ==========================
    # Os dados fiscais da entidade são impressos no cabeçalho do documento,
    # sobrescrevendo o cabeçalho institucional por defeito.
    try:
        config = getattr(getattr(invoice, "tenant", None), "configuracao", None)
    except Exception:
        config = None
    if config is not None:
        ident_bits = []
        if getattr(config, "nuit", ""):
            ident_bits.append(f"NUIT: {config.nuit}")
        if getattr(config, "license_number", ""):
            ident_bits.append(f"Alvará: {config.license_number}")
        if getattr(config, "health_unit_registration", ""):
            ident_bits.append(f"Reg.: {config.health_unit_registration}")

        contact_bits = []
        if getattr(config, "fiscal_phone", ""):
            contact_bits.append(f"Tel: {config.fiscal_phone}")
        if getattr(config, "fiscal_email", ""):
            contact_bits.append(str(config.fiscal_email))
        if getattr(config, "technical_manager", ""):
            contact_bits.append(f"Resp. téc.: {config.technical_manager}")

        header_sublines = []
        if ident_bits:
            header_sublines.append(" • ".join(ident_bits))
        if getattr(config, "fiscal_address", ""):
            header_sublines.append(str(config.fiscal_address).replace("\n", " "))
        if contact_bits:
            header_sublines.append(" • ".join(contact_bits))

        header_title = (getattr(config, "legal_name", "") or getattr(getattr(invoice, "tenant", None), "name", "") or "").strip()
        if header_title or header_sublines:
            if header_title:
                doc.header_title = header_title
            if header_sublines:
                doc.header_lines = header_sublines[:3]

    currency_code = getattr(config, "currency", "") if config is not None else ""
    currency_line_bits = [f"<b>Tipo de moeda:</b> {_currency_label(currency_code)}"]
    if getattr(config, "nuit", ""):
        currency_line_bits.append(f"NUIT emitente: {config.nuit}")
    if getattr(config, "license_number", ""):
        currency_line_bits.append(f"Alvará: {config.license_number}")
    if getattr(config, "health_unit_registration", ""):
        currency_line_bits.append(f"Reg. unidade: {config.health_unit_registration}")
    verification_code = (getattr(invoice, "verification_hash", "") or "").strip()
    if verification_code:
        currency_line_bits.append(f"Validação: {verification_code[:12]}")
    currency_fiscal_line = " • ".join(currency_line_bits)

    # ==========================
    # CLIENTE FISCAL / QUEM PAGA (dados — uma vez)
    # ==========================
    try:
        fiscal_client = invoice.fiscal_client_details()
    except Exception:
        fiscal_client = {"kind": "none", "name": "—", "nuit": "", "address": ""}
    fc_is_entity = fiscal_client.get("kind") == "entity"
    fc_nuit_label = "NUIT" if fc_is_entity else "NUIT/Doc"
    fc_kind_label = "Pagante (entidade)" if fc_is_entity else "Pagante"
    fc_bits = [f"<b>{fc_kind_label}:</b> {fiscal_client.get('name') or '—'}"]
    if fiscal_client.get("nuit"):
        fc_bits.append(f"{fc_nuit_label}: {fiscal_client['nuit']}")
    if fiscal_client.get("address"):
        fc_bits.append(str(fiscal_client["address"]).replace("\n", " "))
    fc_line = " • ".join(fc_bits)

    # ==========================
    # COMPOSIÇÃO DE UMA VIA (flowables novos a cada chamada)
    # ==========================
    is_draft_invoice = getattr(invoice, "status", None) == "RASC"
    title_prefix = "RASCUNHO DA FATURA" if is_draft_invoice else "ORDEM DA FATURA"

    def _compose_via(via_name: str | None = None, via_dest: str | None = None) -> list:
        body: list = []

        # Identificação da via: omitida em rascunhos para não indicar ORIGINAL.
        if via_name and via_dest:
            body.append(Paragraph(f"{via_name} — {via_dest}", via_style))
            body.append(Spacer(1, 0.2 * cm))

        # Cabeçalho do documento.
        body.append(Paragraph(f"{title_prefix} N. {getattr(invoice, 'custom_id', '—')}", style_title))
        body.append(Spacer(1, 0.2 * cm))

        # Bloco de identificação.
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

        # Cliente fiscal (quem paga) — pode diferir do paciente.
        body.append(Paragraph(fc_line, entity_style))
        body.append(Spacer(1, 0.06 * cm))
        body.append(Paragraph(currency_fiscal_line, entity_style))
        body.append(Spacer(1, 0.12 * cm))

        def _append_item_section(label, section_items):
            body.append(Paragraph(label, style_section))
            body.append(Spacer(1, 0.1 * cm))

            rows = [_make_header()]
            for item in section_items:
                qtd = getattr(item, "quantity", Decimal("1.00")) or Decimal("1.00")
                price_unit = getattr(item, "unit_price", Decimal("0.00")) or Decimal("0.00")
                description = getattr(item, "description", None) or "—"
                percentual = getattr(item, "vat_percentage", Decimal("0.00")) or Decimal("0.00")
                value_iva = getattr(item, "vat_amount", Decimal("0.00")) or Decimal("0.00")
                subtotal_item = getattr(item, "total_com_iva", Decimal("0.00")) or Decimal("0.00")

                rows.append(
                    [
                        cell_paragraph(description),
                        num_cell(fmt_quant(qtd)),
                        num_cell(fmt_money_plain(price_unit)),
                        num_cell(fmt_percent(percentual)),
                        num_cell(fmt_money_plain(value_iva)),
                        num_cell(fmt_money_plain(subtotal_item)),
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
                repeatRows=1,
            )
            table.setStyle(
                TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                        ("ALIGN", (0, 0), (0, -1), "LEFT"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 2),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                        ("TOPPADDING", (0, 0), (-1, -1), 0),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                        ("TOPPADDING", (0, 1), (-1, 1), 0.1 * cm),
                        ("LINEABOVE", (0, 0), (-1, 0), 0.6, colors.darkblue),
                        ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.darkblue),
                        ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.grey),
                    ]
                )
            )
            body.append(table)
            body.append(Spacer(1, 0.1 * cm))

        assigned = set()
        for singular, plural, predicate in section_defs:
            section_items = [item for item in itens if predicate(item)]
            for item in section_items:
                assigned.add(item.pk)
            if not section_items:
                continue
            _append_item_section(_label(singular, plural, len(section_items)), section_items)

        remaining = [item for item in itens if item.pk not in assigned]
        if remaining:
            type_choices = dict(TipoItem.choices)
            grouped: dict = {}
            for item in remaining:
                grouped.setdefault(item.item_type, []).append(item)

            for tipo, group_items in grouped.items():
                singular, plural = TYPE_LABELS.get(tipo, (None, None))
                if not singular:
                    singular = plural = type_choices.get(tipo, "Item")
                _append_item_section(_label(singular, plural, len(group_items)), group_items)

        if not itens:
            body.append(cell_paragraph("Nenhum item registrado.", is_bold=True))
            body.append(Spacer(1, 0.22 * cm))

        # Totais.
        totais_date = [
            [cell_paragraph("Subtotal (sem IVA):"), num_cell(fmt_money(subtotal_sem_iva))],
            [cell_paragraph("Valor total do IVA:"), num_cell(fmt_money(value_total_iva))],
            [cell_paragraph("Total (com IVA):"), num_cell(fmt_money(total_com_iva))],
            [cell_paragraph("TOTAL A PAGAR (com IVA):"), num_cell(fmt_money(total_a_pagar_com_iva))],
        ]
        totais_table = Table(totais_date, colWidths=[usable_width * 0.60, usable_width * 0.40])
        totais_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.grey),
                    ("LINEABOVE", (0, -1), (-1, -1), 0.8, colors.darkblue),
                ]
            )
        )
        body.append(totais_table)
        body.append(Spacer(1, 0.1 * cm))

        # Nota legal do IVA.
        body.append(Paragraph(iva_legal_note, iva_note_style))
        body.append(Spacer(1, 0.15 * cm))

        # Pagamento / liquidação (detalhe do pagante: todos os métodos usados).
        body.append(Paragraph("Pagamentos e liquidação do pagante", style_section))
        body.append(Spacer(1, 0.1 * cm))
        if payments:
            pay_rows = [[
                cell_paragraph("Data", is_bold=True),
                cell_paragraph("Método", is_bold=True),
                cell_paragraph("Referência", is_bold=True),
                cell_paragraph("Operador", is_bold=True),
                cell_paragraph("Estado", is_bold=True),
                num_header("Valor"),
                num_header("Troco"),
            ]]
            for pay in payments:
                ref = getattr(pay, "external_reference", "") or getattr(pay, "authorization_number", "") or "—"
                operador = user_name(getattr(pay, "created_by", None)) or "—"
                pay_rows.append([
                    cell_paragraph(_fmt_dt(getattr(pay, "paid_at", None) or getattr(pay, "created_at", None))),
                    cell_paragraph(method_labels.get(pay.method, pay.method or "—")),
                    cell_paragraph(str(ref)),
                    cell_paragraph(str(operador)),
                    cell_paragraph(status_labels.get(pay.status, pay.status or "—")),
                    num_cell(fmt_money_plain(getattr(pay, "value", 0))),
                    num_cell(fmt_money_plain(getattr(pay, "change_amount", 0))),
                ])
            pay_table = Table(
                pay_rows,
                colWidths=[
                    usable_width * 0.16,
                    usable_width * 0.14,
                    usable_width * 0.16,
                    usable_width * 0.18,
                    usable_width * 0.12,
                    usable_width * 0.12,
                    usable_width * 0.12,
                ],
                repeatRows=1,
            )
            pay_table.setStyle(
                TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("ALIGN", (5, 1), (-1, -1), "RIGHT"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 2),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                        ("TOPPADDING", (0, 0), (-1, -1), 0),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                        ("TOPPADDING", (0, 1), (-1, 1), 0.1 * cm),
                        ("LINEABOVE", (0, 0), (-1, 0), 0.6, colors.darkblue),
                        ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.darkblue),
                        ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.grey),
                    ]
                )
            )
            body.append(pay_table)
            body.append(Spacer(1, 0.1 * cm))
        else:
            body.append(cell_paragraph("Sem pagamentos registados."))
            body.append(Spacer(1, 0.1 * cm))

        liquidacao_rows = [
            [cell_paragraph("Total pago (confirmado):"), num_cell(fmt_money(confirmed_paid))],
            [cell_paragraph("Em dívida:"), num_cell(fmt_money(outstanding))],
            [cell_paragraph("Estado de liquidação:"), cell_paragraph(settle_label)],
            [cell_paragraph("Recibo(s):"), cell_paragraph(receipt_numbers)],
        ]
        liquidacao_table = Table(liquidacao_rows, colWidths=[usable_width * 0.60, usable_width * 0.40])
        liquidacao_table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.grey),
                ]
            )
        )
        body.append(liquidacao_table)
        body.append(Spacer(1, 0.15 * cm))

        # Termina a via.
        append_fim(body)
        return body

    # ==========================
    # MONTAGEM DAS VIAS
    # ==========================
    story: list = []
    if is_draft_invoice:
        # Rascunho é uma única via; se o conteúdo transbordar, páginas de
        # continuação não repetem a marca de Original/Duplicado/Triplicado.
        story.append(NextPageTemplate("later"))
        story.extend(_compose_via())
    else:
        for idx, (via_name, via_dest) in enumerate(INVOICE_VIAS):
            if idx == 0:
                # Páginas seguintes (overflow) desta via usam o template sem letterhead.
                story.append(NextPageTemplate("later"))
            else:
                # Cada nova via começa numa página com letterhead completo.
                story.append(NextPageTemplate("first"))
                story.append(PageBreak())
                story.append(NextPageTemplate("later"))
            story.extend(_compose_via(via_name, via_dest))

    # ==========================
    # BUILD PDF A5
    # ==========================
    frame_first = Frame(
        left_margin,
        bottom_margin,
        usable_width,
        _page_height - top_margin - bottom_margin,
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
        _page_height - PDF_LATER_TOP_MARGIN - bottom_margin,
        id="later",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )

    def _on_first(canvas_obj, doc_):
        on_page(canvas_obj, doc_, user_documento)
        draw_line_full_width(canvas_obj, doc_)

    def _on_later(canvas_obj, doc_):
        draw_institutional_corner_barcode(canvas_obj, doc_)
        _request_institutional_signatures(
            canvas_obj, doc_, user_documento, draw_institutional_signatures
        )
        draw_line_full_width(canvas_obj, doc_)

    doc.addPageTemplates(
        [
            PageTemplate(id="first", frames=[frame_first], onPage=_on_first),
            PageTemplate(id="later", frames=[frame_later], onPage=_on_later),
        ]
    )

    doc.build(story, canvasmaker=NumberedCanvas)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    name_patient = getattr(patient, "name", "patient").replace("/", "-")
    filename = f"{invoice.custom_id}_{name_patient}.pdf"

    return pdf_bytes, filename


_formatar_date_request = _format_request_date
_resolver_user_documento = _resolve_document_user
gerar_pdf_invoice = generate_invoice_pdf
