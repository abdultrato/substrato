"""Geração do PDF de fatura (invoice) em layout institucional A5."""

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
    style_title.alignment = TA_LEFT  # Ordem da fatura alinhada à esquerda.
    style_section = document_section_style("section_fat")

    # ==========================
    # CABEÇALHO DO DOCUMENTO
    # ==========================
    story.append(Spacer(1, 0.35 * cm))
    story.append(
        Paragraph(f"ORDEM DA FATURA N. {getattr(invoice, 'custom_id', '—')}", style_title)
    )
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
            f"Paciente: {getattr(patient, 'name', '—')}",
            f"Idade: {idade_txt}  -  Gênero: {getattr(patient, 'gender', '—') or '—'}",
            f"Documento: {getattr(patient, 'document_type', '—') or '—'}  {getattr(patient, 'document_number', '—') or '—'}",
            f"Contacto: {getattr(patient, 'contact', '—') or '—'}",
        ]

        if getattr(patient, "email", None):
            left_lines.append(f"E-mail: {patient.email or '—'}")

        if getattr(patient, "provenance", None):
            left_lines.append(f"Proveniência: {getattr(patient, 'provenance', '—') or '—'}")

        origin_company = getattr(patient, "origin_company", None)
        requesting_company = getattr(request, "requesting_company", None) if request else None
        empresa_executora = getattr(request, "external_executing_company", None) if request else None
        if requesting_company:
            left_lines.append(f"Empresa solicitante: {getattr(requesting_company, 'name', '—')}")
        elif origin_company:
            left_lines.append(f"Empresa: {getattr(origin_company, 'name', '—')}")
        if empresa_executora:
            left_lines.append(f"Executora externa: {getattr(empresa_executora, 'name', '—')}")
    else:
        left_lines = ["Paciente: —"]

    # ==========================
    # BLOCO DIREITA (FATURA)
    # ==========================
    professional_group = user_primary_group(user_documento)
    professional_name = user_name(user_documento)

    date_request = _format_request_date(request)

    right_lines = [
        f"Data: {date_request}",
        f"{professional_group}: {professional_name}",
        f"Estado: {getattr(invoice, 'status', '—')}",
    ]

    if link_invoice:
        right_lines.append(f"Link: <a href='{link_invoice}' color='blue'>{link_invoice}</a>")

    # Distribui as linhas de identificação por igual: metade em cada coluna
    # (ex.: 7 à esquerda + 3 à direita → 5 e 5), em vez de patient à esquerda e
    # fatura à direita com contagens desequilibradas.
    id_lines = left_lines + right_lines
    half = (len(id_lines) + 1) // 2
    left_lines = id_lines[:half]
    right_lines = id_lines[half:]

    info_table = montar_bloco_identificacao(
        usable_width=usable_width,
        left_lines=left_lines,
        right_lines=right_lines,
        left_ratio=0.5,  # Distribui as duas colunas de identificação por igual.
    )

    story.append(info_table)
    story.append(Spacer(1, 0.15 * cm))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.darkblue))
    story.append(Spacer(1, 0.15 * cm))

    # ==========================
    # ITENS DA FATURA
    # ==========================
    # Sem título genérico: cada secção já tem o seu título específico
    # (Exames laboratoriais, Consultas, Medicamentos, etc.).
    itens = list(invoice.items.select_related("exam", "medical_exam").filter(deleted=False))
    subtotal_geral = Decimal("0.00")

    for item in itens:
        subtotal_geral += item.total_sem_iva or Decimal("0.00")

    TipoItem = InvoiceItem.TipoItem

    # Rótulos (singular, plural) por tipo de item. O título de cada secção usa
    # o singular quando há um único item e o plural quando há vários, evitando
    # termos genéricos e vagos como "Outros itens".
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

    # Secções principais: (singular, plural, predicado).
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

    assigned = set()

    # Cabeçalho das colunas numéricas: negrito alinhado à direita, para ficar
    # por cima dos respetivos valores (também alinhados à direita).
    num_header_style = ParagraphStyle(
        "NumHeader",
        fontName=FONT_BOLD_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_RIGHT,
    )

    def num_header(text):
        return Paragraph(text, num_header_style)

    header = [
        cell_paragraph("Descrição", is_bold=True),
        num_header("Qtd"),
        num_header("Preço (MZN)"),
        num_header("% IVA"),
        num_header("#IVA (MZN)"),
        num_header("Subtotal (MZN)"),
    ]

    def fmt_money(value):
        try:
            value = Decimal(str(value)).quantize(Decimal("0.01"))
        except Exception:
            value = Decimal("0.00")
        return f"{value:,.2f} MZN".replace(",", " ")

    def fmt_money_plain(value):
        """Valor monetário sem o sufixo de moeda (a moeda vai no cabeçalho)."""
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

    # Estilo para dados numéricos: alinhado à direita. A Helvetica usa dígitos
    # de largura tabular (todos os algarismos têm a mesma largura), por isso o
    # alinhamento à direita com 2 casas decimais fixas faz coincidir, na
    # vertical, as casas decimais, as unidades, os milhares, etc.
    num_style = ParagraphStyle(
        "NumCell",
        fontName=FONT_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_RIGHT,
    )

    def num_cell(text):
        return Paragraph("" if text is None else str(text), num_style)

    def _append_item_section(label, section_items):
        """Acrescenta uma secção titulada com a tabela dos respetivos itens."""
        story.append(Paragraph(label, style_section))
        story.append(Spacer(1, 0.1 * cm))

        rows = [header]
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
                    # Espaço logo acima do primeiro item (1.ª linha de dados).
                    ("TOPPADDING", (0, 1), (-1, 1), 0.1 * cm),
                    # Linhas horizontais explícitas (sem linhas verticais):
                    # contorno superior/inferior + separador por cada linha.
                    ("LINEABOVE", (0, 0), (-1, 0), 0.6, colors.darkblue),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.darkblue),
                    ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.grey),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 0.1 * cm))

    for singular, plural, predicate in section_defs:
        section_items = [item for item in itens if predicate(item)]
        for item in section_items:
            assigned.add(item.pk)
        if not section_items:
            continue
        _append_item_section(_label(singular, plural, len(section_items)), section_items)

    # Itens restantes: em vez de um título genérico "Outros itens", são
    # agrupados por tipo, cada grupo com um título específico (singular/plural).
    remaining = [item for item in itens if item.pk not in assigned]
    if remaining:
        type_choices = dict(TipoItem.choices)
        grouped: dict = {}
        for item in remaining:
            grouped.setdefault(item.item_type, []).append(item)

        for tipo, group_items in grouped.items():
            singular, plural = TYPE_LABELS.get(tipo, (None, None))
            if not singular:
                # Fallback: usa o próprio rótulo do tipo de item.
                singular = plural = type_choices.get(tipo, "Item")
            _append_item_section(_label(singular, plural, len(group_items)), group_items)

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
            cell_paragraph("Subtotal (sem IVA):"),
            num_cell(fmt_money(subtotal_sem_iva)),
        ],
        [cell_paragraph("Valor total do IVA:"), num_cell(fmt_money(value_total_iva))],
        [cell_paragraph("Total (com IVA):"), num_cell(fmt_money(total_com_iva))],
        [
            cell_paragraph("TOTAL A PAGAR (com IVA):"),
            num_cell(fmt_money(total_a_pagar_com_iva)),
        ]
    ]

    totais_table = Table(totais_date, colWidths=[usable_width * 0.60, usable_width * 0.40])
    totais_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                # Linhas horizontais explícitas (sem verticais).
                ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.grey),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, colors.darkblue),
            ]
        )
    )

    story.append(totais_table)
    story.append(Spacer(1, 0.15 * cm))

    # Sem bloco de QR Code inline no fim: o carimbo QR no canto da página já
    # garante o acesso/verificação. O documento termina apenas com "Fim".
    append_fim(story)

    # ==========================
    # BUILD PDF A5
    # ==========================
    # Página 1: letterhead completo (margem superior PDF_HEADER_TOP_MARGIN).
    # Página 2+: sem letterhead, apenas margem de 0.8cm e o conteúdo restante.
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
        # Sem header a partir da 2.ª página; mantém carimbo e linha. As
        # assinaturas são diferidas para a última página (ver NumberedCanvas).
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

    # A partir da página seguinte, usa o template "later" (sem header).
    story.insert(0, NextPageTemplate("later"))

    doc.build(story, canvasmaker=NumberedCanvas)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    name_patient = getattr(patient, "name", "patient").replace("/", "-")
    filename = f"{invoice.custom_id}_{name_patient}.pdf"

    return pdf_bytes, filename


_formatar_date_request = _format_request_date
_resolver_user_documento = _resolve_document_user
gerar_pdf_invoice = generate_invoice_pdf
