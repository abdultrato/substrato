import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from domain.clinical.result_state import ResultState

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


def _format_results_date(request):
    date = getattr(request, "created_at", None)
    if not date:
        return "—"
    return date.strftime("%d/%m/%Y %H:%M")


def _resolve_document_user(request, resultados_qs):
    if resultados_qs:
        for r in resultados_qs:
            if r.validated_by:
                return r.validated_by

    return getattr(request, "analyst", None)


def generate_results_pdf(request, apenas_validados=True) -> tuple[bytes, str]:
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

    elements = []

    patient = request.patient

    # Código de barras no header (repete em todas páginas)
    try:
        result_obj = getattr(request, "result", None)
        cod_result = getattr(result_obj, "custom_id", None) or getattr(request, "custom_id", "")
        doc.barcode_value = f"PAC:{getattr(patient, 'custom_id', '')}|RES:{cod_result}"
    except Exception:
        doc.barcode_value = None

    # =====================================
    # RESULTADOS
    # =====================================

    result = getattr(request, "result", None)

    resultados_qs = result.items.select_related("exam_field", "exam_field__exam") if result else []

    if apenas_validados and resultados_qs:
        resultados_qs = resultados_qs.filter(status=ResultState.VALIDATED)

    user_documento = _resolve_document_user(
        request,
        resultados_qs,
    )

    # =====================================
    # IDENTIFICAÇÃO DO PACIENTE
    # =====================================

    left_lines = [
        f"{bold('Paciente')}: {patient.name}",
        f"{bold('Idade')}: {patient.idade()} - {bold('Gênero')}: {patient.gender or '—'} - {bold('Raça')}: {patient.race_origin}",
        f"{bold('Documento')}: {patient.document_type}: {patient.document_number or 'Não forneceu documento'}",
        f"{bold('Proveniência')}: {patient.provenance or '—'}",
        f"{bold('Contacto')}: {patient.contact or '—'}",
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
        f"{bold('Data dos Resultados')}: {_format_results_date(request)}",
        f"{bold('Técn. de Laboratório')}: {technician_texto}",
    ]

    # =====================================
    # TÍTULO
    # =====================================

    style_title = document_title_style("HeadingRes")
    style_section = document_section_style("SectionRes")

    elements.append(Paragraph("RESULTADOS DE ANÁLISES", style_title))
    elements.append(Spacer(1, 0.3 * cm))

    patient_table = montar_bloco_identificacao(
        usable_width=usable_width,
        left_lines=left_lines,
        right_lines=right_lines,
    )

    elements.append(patient_table)
    elements.append(Spacer(1, 0.3 * cm))

    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    elements.append(Spacer(1, 0.3 * cm))

    elements.append(Paragraph("ANÁLISES PROCESSADAS", style_section))
    elements.append(Spacer(1, 0.2 * cm))

    # =====================================
    # AGRUPAMENTO POR EXAME
    # =====================================

    exams_agrupados = {}

    for item in resultados_qs:
        exam = item.exam_field.exam
        exams_agrupados.setdefault(exam.name, []).append(item)

    # =====================================
    # TABELAS
    # =====================================

    if exams_agrupados:
        for exam_name, resultados in exams_agrupados.items():
            exam = resultados[0].exam_field.exam

            elements.append(Spacer(1, 0.2 * cm))
            elements.append(
                Paragraph(
                    f"{exam_name} — {exam.method}",
                    style_section,
                )
            )

            elements.append(Spacer(1, 0.2 * cm))

            date = [
                [
                    cell_paragraph("Parâmetro", True),
                    cell_paragraph("Resultado", True),
                    cell_paragraph("Unidade", True),
                    cell_paragraph("Valor de Referência", True),
                ]
            ]

            for r in resultados:
                campo = r.exam_field

                value = r.result_value_formatado or "-"

                date.append(
                    [
                        cell_paragraph(campo.name),
                        cell_paragraph(value),
                        cell_paragraph(campo.unit or "-"),
                        cell_paragraph(campo.referencia or "-"),
                    ]
                )

            table = Table(
                date,
                colWidths=[
                    usable_width * 0.40,
                    usable_width * 0.25,
                    usable_width * 0.15,
                    usable_width * 0.20,
                ],
            )

            table.setStyle(
                TableStyle(
                    [
                        ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 2),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.darkblue),
                    ]
                )
            )

            elements.append(table)
            elements.append(Spacer(1, 0.3 * cm))

    else:
        elements.append(
            cell_paragraph(
                "Nenhum result disponível para esta requisição.",
                True,
            )
        )

    append_fim(elements)

    # =====================================
    # BUILD
    # =====================================

    doc.build(
        elements,
        onFirstPage=lambda c, d: (
            on_page(c, d, user_documento),
            draw_line_full_width(c, d),
        ),
        onLaterPages=lambda c, d: (
            on_page(c, d, user_documento),
            draw_line_full_width(c, d),
        ),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"{request.custom_id}_{request.patient.name}.pdf"

    return pdf_bytes, filename


_formatar_date_resultados = _format_results_date
_resolver_user_documento = _resolve_document_user
gerar_pdf_resultados = generate_results_pdf
