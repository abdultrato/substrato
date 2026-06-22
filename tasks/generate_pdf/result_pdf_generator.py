"""Geração do PDF de resultados laboratoriais com cabeçalhos personalizados."""

import io
import os

from django.conf import settings
from reportlab.lib.pagesizes import A5
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

from domain.clinical.result_state import ResultState

from .institutional_pdf_design import (
    ImprovedInstitutionalNumberedCanvas as NumberedCanvas,
    append_fim,
    institutional_cell_paragraph as cell_paragraph,
    institutional_draw_line_full_width_improved as draw_line_full_width,
    institutional_user_identity_improved as institutional_user_identity,
    institutional_montar_bloco_identificacao as montar_bloco_identificacao,
    PDF_MARGIN,
    pdf_encryption,
    institutional_title_style as title_style_improved,
    institutional_section_style as section_style_improved,
    institutional_bold_text as bold_text,
    FONT_BOLD_INST as FONT_IMPROVED_BOLD,
    build_institutional_header_config as build_personalized_header,
    draw_institutional_corner_barcode as draw_corner_barcode,
    draw_institutional_header_improved as draw_header_improved,
    institutional_a5_margins as A5Margins,
    institutional_document_type as DocumentType,
)


def _format_results_date(request):
    """Formata a data base do documento de resultados."""
    date = getattr(request, "created_at", None)
    if not date:
        return "—"
    return date.strftime("%d/%m/%Y %H:%M")


def _resolve_document_user(request, resultados_qs):
    """Escolhe o utilizador institucional a exibir no cabeçalho do PDF."""
    if resultados_qs:
        for r in resultados_qs:
            if r.validated_by:
                return r.validated_by

    return getattr(request, "analyst", None)


def generate_results_pdf(request, apenas_validados=True) -> tuple[bytes, str]:
    """Monta e devolve o PDF de resultados laboratoriais em formato A5 com cabeçalho personalizado."""
    buffer = io.BytesIO()

    # Usar margens otimizadas para A5
    usable_width = A5Margins.usable_width()

    _page_width, page_height = A5
    doc = BaseDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=A5Margins.LEFT,
        rightMargin=A5Margins.RIGHT,
        topMargin=A5Margins.TOP,
        bottomMargin=A5Margins.BOTTOM,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = False

    elements = []

    patient = request.patient

    # Obter tenant para personalizar cabeçalho
    tenant = getattr(patient, "tenant", None)
    tenant_name = getattr(tenant, "name", "CLÍNICA DE DIAGNÓSTICOS E SAÚDE")

    # Construir cabeçalho personalizado para laboratório
    header_config = build_personalized_header(
        doc_type=DocumentType.LABORATORY_RESULT,
        tenant_name=tenant_name,
        logo_path=os.path.join(settings.BASE_DIR, "static", "img", "logo.png"),
    )

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
        f"{bold_text('Paciente')}: {patient.name}",
        f"{bold_text('Idade')}: {patient.idade()} - {bold_text('Gênero')}: {patient.gender or '—'} - {bold_text('Raça')}: {patient.race_origin}",
        f"{bold_text('Documento')}: {patient.document_type}: {patient.document_number or 'Não forneceu documento'}",
        f"{bold_text('Proveniência')}: {patient.provenance or '—'}",
        f"{bold_text('Contacto')}: {patient.contact or '—'}",
    ]

    origin_company = getattr(patient, "origin_company", None)
    requesting_company = getattr(request, "requesting_company", None)
    empresa_executora = getattr(request, "external_executing_company", None)
    if requesting_company:
        left_lines.append(f"{bold_text('Empresa solicitante')}: {getattr(requesting_company, 'name', '—')}")
    elif origin_company:
        left_lines.append(f"{bold_text('Empresa')}: {getattr(origin_company, 'name', '—')}")
    if empresa_executora:
        left_lines.append(f"{bold_text('Executora externa')}: {getattr(empresa_executora, 'name', '—')}")

    technician_texto = institutional_user_identity(user_documento)

    right_lines = [
        f"{bold_text('E-mail')}: {patient.email or '—'}",
        f"{bold_text('Requisição')}: {request.custom_id}",
        f"{bold_text('Data dos Resultados')}: {_format_results_date(request)}",
        f"{bold_text('Técn. de Laboratório')}: {technician_texto}",
    ]

    # =====================================
    # TÍTULO (Usar estilos melhorados)
    # =====================================

    elements.append(Paragraph("RESULTADOS DE ANÁLISES", title_style_improved()))
    elements.append(Spacer(1, A5Margins.SECTION_SPACING))

    patient_table = montar_bloco_identificacao(
        usable_width=usable_width,
        left_lines=left_lines,
        right_lines=right_lines,
    )

    elements.append(patient_table)
    elements.append(Spacer(1, A5Margins.SECTION_SPACING))

    # Linha divisória com cor do setor
    elements.append(HRFlowable(
        width="100%",
        thickness=0.5,
        color=header_config["sector_color"]
    ))
    elements.append(Spacer(1, A5Margins.SECTION_SPACING))

    # Seção com cor personalizada
    elements.append(Paragraph(
        "ANÁLISES PROCESSADAS",
        section_style_improved(color=header_config["sector_color"])
    ))
    elements.append(Spacer(1, A5Margins.ROW_SPACING))

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

            elements.append(Spacer(1, A5Margins.ROW_SPACING))
            elements.append(
                Paragraph(
                    f"{exam_name} — {exam.method}",
                    section_style_improved(color=header_config["sector_color"]),
                )
            )

            elements.append(Spacer(1, A5Margins.ROW_SPACING))

            date = [
                [
                    cell_paragraph("Parâmetro", True),
                    cell_paragraph("Resultado", True),
                    cell_paragraph("Unidade", True),
                    cell_paragraph("Referência", True),
                ]
            ]

            for r in resultados:
                campo = r.exam_field

                value = getattr(r, "formatted_result_value", None)
                if not value:
                    raw_value = getattr(r, "result_value", None)
                    value = "-" if raw_value is None else str(raw_value)
                # `reference` (propriedade do campo) devolve o intervalo formatado
                # ou None. Não usar a relação reversa `referencias`: é um
                # RelatedManager cujo str() vira "clinical.ClinicalReference.None"
                # e vazava para o PDF.
                reference_value = (
                    getattr(campo, "reference", None)
                    or getattr(campo, "referencia", None)
                    or "-"
                )

                date.append(
                    [
                        cell_paragraph(campo.name),
                        cell_paragraph(value),
                        cell_paragraph(campo.unit or "-"),
                        cell_paragraph(reference_value),
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
                        ("FONTNAME", (0, 0), (-1, 0), FONT_IMPROVED_BOLD),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 2),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                        ("LINEBELOW", (0, 0), (-1, 0), 0.5, header_config["sector_color"]),
                    ]
                )
            )

            elements.append(table)
            elements.append(Spacer(1, A5Margins.SECTION_SPACING))

    else:
        elements.append(
            cell_paragraph(
                "Nenhum result disponível para esta requisição.",
                True,
            )
        )

    append_fim(elements)

    # =====================================
    # BUILD COM CABEÇALHO PERSONALIZADO
    # =====================================

    # Página 1 com o header personalizado (e o espaço da sua banda); a partir da
    # 2ª página o header não se repete — o frame recupera o espaço e ficam só o
    # código de barras de canto e a linha de rodapé.
    first_frame = Frame(
        A5Margins.LEFT,
        A5Margins.BOTTOM,
        usable_width,
        page_height - A5Margins.TOP - A5Margins.BOTTOM,
        id="first",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    later_frame = Frame(
        A5Margins.LEFT,
        A5Margins.BOTTOM,
        usable_width,
        page_height - PDF_MARGIN - A5Margins.BOTTOM,
        id="later",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )

    def _first_page(canvas_obj, doc_obj):
        draw_header_improved(canvas_obj, doc_obj, header_config)
        draw_corner_barcode(canvas_obj, doc_obj)
        draw_line_full_width(canvas_obj, doc_obj)

    def _later_page(canvas_obj, doc_obj):
        draw_corner_barcode(canvas_obj, doc_obj)
        draw_line_full_width(canvas_obj, doc_obj)

    doc.addPageTemplates(
        [
            PageTemplate(id="first", frames=[first_frame], onPage=_first_page),
            PageTemplate(id="later", frames=[later_frame], onPage=_later_page),
        ]
    )
    elements.insert(0, NextPageTemplate("later"))
    doc.build(elements, canvasmaker=NumberedCanvas)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    surname = (request.patient.name or "").strip().split()[-1] if (request.patient.name or "").strip() else "paciente"
    filename = f"{request.custom_id}_{surname}.pdf"

    return pdf_bytes, filename


_formatar_date_resultados = _format_results_date
_resolver_user_documento = _resolve_document_user
gerar_pdf_resultados = generate_results_pdf
