"""Geração do PDF institucional de requisições de exames."""

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
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

from .institutional_pdf_design import (
    FONT_INST,
    FONT_BOLD_INST,
    InstitutionalNumberedCanvas as NumberedCanvas,
    PDF_BOTTOM_MARGIN,
    PDF_BODY_FONT_SIZE,
    PDF_HEADER_TOP_MARGIN,
    PDF_MARGIN,
    append_fim,
    bold_inst as bold,
    draw_institutional_corner_barcode,
    institutional_cell_paragraph as cell_paragraph,
    institutional_section_style as document_section_style,
    institutional_title_style as document_title_style,
    institutional_draw_line_full_width as draw_line_full_width,
    institutional_user_identity,
    institutional_montar_bloco_identificacao as montar_bloco_identificacao,
    institutional_on_page as on_page,
    pdf_encryption,
)


def _format_request_date(request):
    """Formata a data de criação da requisição para apresentação no PDF."""
    date = getattr(request, "created_at", None) or getattr(request, "created_at", None)
    if not date:
        return "—"
    return date.strftime("%d/%m/%Y %H:%M")


def _exam_code(exam):
    """Resolve o código público do exame com fallback seguro."""
    return getattr(exam, "code", None) or getattr(exam, "custom_id", None) or "—"


def _resolve_document_user(request):
    """Resolve o profissional a apresentar como emissor do documento."""
    return getattr(request, "created_by", None) or getattr(request, "analyst", None)


def generate_request_pdf(request) -> tuple[bytes, str]:
    """Monta e devolve o PDF da requisição de exames em bytes."""
    buffer = io.BytesIO()
    page_width, page_height = A5
    min_margin = PDF_MARGIN
    usable_width = page_width - 2 * min_margin

    doc = BaseDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=min_margin,
        rightMargin=min_margin,
        topMargin=PDF_HEADER_TOP_MARGIN,
        bottomMargin=PDF_BOTTOM_MARGIN,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = False

    # Código de barras no header (repete em todas páginas)
    try:
        patient = request.patient
        doc.barcode_value = f"PAC:{getattr(patient, 'custom_id', '')}|REQ:{getattr(request, 'custom_id', '')}"
    except Exception:
        doc.barcode_value = None

    story = []

    style_title = document_title_style("HeadingReq")

    story.append(Spacer(1, 0.6 * cm))
    patient = request.patient
    eh_externa = bool(
        getattr(request, "requesting_company_id", None)
        or getattr(request, "external_executing_company_id", None)
        or getattr(patient, "origin_company_id", None)
    )
    story.append(
        Paragraph(
            "REQUISIÇÃO EXTERNA DE SERVIÇOS" if eh_externa else "REQUISIÇÃO DE EXAMES",
            style_title,
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    idade = getattr(patient, "idade", lambda: "—")()
    user_documento = _resolve_document_user(request)

    left_lines = [
        f"{bold('Paciente')}: {patient.name}",
        f"{bold('Idade')}: {idade}   -  {bold('Gênero')}: {patient.gender or '—'}   -  {bold('Raça')}: {patient.race_origin or '—'}",
        f"{bold('Documento')}: {patient.document_type or '—'}    {patient.document_number or '—'}",
        f"{bold('Proveniência')}: {getattr(patient, 'provenance', '—')}",
        f"{bold('Contacto e Whatsapp')}: {patient.contact or '—'}",
    ]

    origin_company = getattr(patient, "origin_company", None)
    requesting_company = getattr(request, "requesting_company", None)
    empresa_executora = getattr(request, "external_executing_company", None)
    if requesting_company:
        left_lines.append(f"{bold('Empresa solicitante')}: {getattr(requesting_company, 'name', '—')}")
    elif origin_company:
        left_lines.append(f"{bold('Empresa')}: {getattr(origin_company, 'name', '—')}")
    if empresa_executora:
        left_lines.append(f"{bold('Executora externa')}: {getattr(empresa_executora, 'name', '—')}")

    technician_texto = institutional_user_identity(user_documento)

    right_lines = [
        f"{bold('E-mail')}: {patient.email or '—'}",
        f"{bold('Requisição')}: {request.custom_id}",
        f"{bold('Data da Requisição')}: {_format_request_date(request)}",
        f"{bold('Técn. de Laboratório')}: {technician_texto}",
    ]

    patient_table = montar_bloco_identificacao(
        usable_width=usable_width,
        left_lines=left_lines,
        right_lines=right_lines,
    )
    story.append(patient_table)
    story.append(Spacer(1, 0.3 * cm))

    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    story.append(Spacer(1, 0.2 * cm))

    # ── Médico solicitante ────────────────────────────────────────────────────
    physician = getattr(request, "requesting_physician", None)
    if physician:
        profession_name = ""
        try:
            profession_name = physician.profession.name if physician.profession_id else ""
        except Exception:
            pass
        physician_lines = [f"{bold('Médico solicitante')}: {physician.name}"]
        if profession_name:
            physician_lines.append(f"{bold('Especialidade / Profissão')}: {profession_name}")
        physician_block = montar_bloco_identificacao(
            usable_width=usable_width,
            left_lines=physician_lines,
            right_lines=[],
        )
        story.append(physician_block)
        story.append(Spacer(1, 0.2 * cm))
        story.append(HRFlowable(width="100%", thickness=0.3, color=colors.HexColor("#d0d7e3")))
        story.append(Spacer(1, 0.2 * cm))

    style_section = document_section_style("section_title")
    story.append(Paragraph("EXAMES REQUISITADOS", style_section))
    story.append(Spacer(1, 0.2 * cm))

    exams = request.exams.all()

    col_w = [usable_width * p for p in (0.20, 0.52, 0.28)]
    header_bg = colors.HexColor("#1e3a5f")
    zebra_bg = colors.HexColor("#f4f7fb")

    _header_style = ParagraphStyle(
        "ExamTH",
        fontName=FONT_BOLD_INST,
        fontSize=PDF_BODY_FONT_SIZE - 1,
        leading=PDF_BODY_FONT_SIZE + 1,
        textColor=colors.white,
        alignment=TA_LEFT,
    )

    def _th(text):
        return Paragraph(text, _header_style)

    header_row = [_th("CÓDIGO"), _th("NOME DO EXAME"), _th("MÉTODO")]

    if exams.exists():
        data_rows = [
            [
                cell_paragraph(_exam_code(e)),
                cell_paragraph(e.name.capitalize()),
                cell_paragraph((e.method or "—").capitalize()),
            ]
            for e in exams
        ]
    else:
        data_rows = [[cell_paragraph("Nenhum exame registado.", is_bold=True), cell_paragraph(""), cell_paragraph("")]]

    table_data = [header_row] + data_rows

    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        # Apenas linhas horizontais: traço sob o cabeçalho e sob cada linha de
        # dados (sem GRID, logo sem linhas verticais).
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#1e3a5f")),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#d0d7e3")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    for i, _ in enumerate(data_rows):
        if i % 2 == 1:
            style_cmds.append(("BACKGROUND", (0, i + 1), (-1, i + 1), zebra_bg))

    tabela_exams = Table(table_data, colWidths=col_w, repeatRows=1)
    tabela_exams.setStyle(TableStyle(style_cmds))
    # Sem KeepTogether: a tabela flui a partir da 1ª página e quebra ao longo
    # das páginas (o cabeçalho repete-se via repeatRows). Antes, o KeepTogether
    # empurrava a tabela inteira para a 2ª página quando não cabia no espaço
    # restante da primeira.
    story.append(tabela_exams)

    append_fim(story)

    # Página 1 com o header institucional (e o espaço da sua banda); a partir da
    # 2ª página o header da requisição não se repete — o frame recupera esse
    # espaço e só ficam os carimbos de canto (QR + código de barras) e o rodapé.
    first_frame = Frame(
        min_margin,
        PDF_BOTTOM_MARGIN,
        usable_width,
        page_height - PDF_HEADER_TOP_MARGIN - PDF_BOTTOM_MARGIN,
        id="first",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    later_frame = Frame(
        min_margin,
        PDF_BOTTOM_MARGIN,
        usable_width,
        page_height - PDF_MARGIN - PDF_BOTTOM_MARGIN,
        id="later",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )

    def _first_page(canvas_obj, doc_obj):
        on_page(canvas_obj, doc_obj, user_documento)
        draw_line_full_width(canvas_obj, doc_obj)

    def _later_page(canvas_obj, doc_obj):
        # Sem header e sem QR a partir da 2ª página; mantém só o código de
        # barras de canto e a linha de rodapé.
        draw_institutional_corner_barcode(canvas_obj, doc_obj)
        draw_line_full_width(canvas_obj, doc_obj)

    doc.addPageTemplates(
        [
            PageTemplate(id="first", frames=[first_frame], onPage=_first_page),
            PageTemplate(id="later", frames=[later_frame], onPage=_later_page),
        ]
    )
    story.insert(0, NextPageTemplate("later"))

    doc.build(story, canvasmaker=NumberedCanvas)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    filename = f"{request.custom_id}_{request.patient.name}.pdf"
    return pdf_bytes, filename


_code_exam = _exam_code
_formatar_date_request = _format_request_date
_resolver_user_documento = _resolve_document_user
gerar_pdf_request = generate_request_pdf
