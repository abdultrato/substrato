"""Geração do PDF institucional de requisições de exames."""

import io

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

from .pdf_base import (
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
    page_width, _ = A5
    min_margin = 1 * cm
    usable_width = page_width - 2 * min_margin

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=min_margin,
        rightMargin=min_margin,
        topMargin=3.8 * cm,
        bottomMargin=2 * cm,
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

    style_section = document_section_style("section_title")
    story.append(Paragraph("EXAMES REQUISITADOS", style_section))
    story.append(Spacer(1, 0.2 * cm))

    exams = request.exams.all()
    exams_date = (
        [
            [
                cell_paragraph(
                    f"{bold('Código')}: {_exam_code(e)} - {bold('Nome')}: {e.name.capitalize()} - {bold('Método')}: {e.method.capitalize()}"
                )
            ]
            for e in exams
        ]
        if exams.exists()
        else [[cell_paragraph("Nenhum exam registrado.", is_bold=True)]]
    )

    tabela_exams = Table(exams_date, colWidths=[usable_width])
    tabela_exams.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    story.append(KeepTogether(tabela_exams))

    append_fim(story)

    doc.build(
        story,
        onFirstPage=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()
    filename = f"{request.custom_id}_{request.patient.name}.pdf"
    return pdf_bytes, filename


_code_exam = _exam_code
_formatar_date_request = _format_request_date
_resolver_user_documento = _resolve_document_user
gerar_pdf_request = generate_request_pdf
