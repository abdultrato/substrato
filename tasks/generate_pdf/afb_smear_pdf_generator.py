"""PDF institucional para resultado de baciloscopia (BAAR)."""

import io
import os
from xml.sax.saxutils import escape

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

from apps.clinical_laboratory.models import AcidFastSmear

from .institutional_pdf_design import (
    FONT_BOLD_INST,
    ImprovedInstitutionalNumberedCanvas as NumberedCanvas,
    PDF_MARGIN,
    append_fim,
    build_institutional_header_config as build_personalized_header,
    draw_institutional_corner_barcode as draw_corner_barcode,
    draw_institutional_header_improved as draw_header_improved,
    institutional_a5_margins as A5Margins,
    institutional_bold_text as bold_text,
    institutional_cell_paragraph as cell_paragraph,
    institutional_document_type as DocumentType,
    institutional_draw_line_full_width_improved as draw_line_full_width,
    institutional_montar_bloco_identificacao as montar_bloco_identificacao,
    institutional_section_style as section_style_improved,
    institutional_title_style as title_style_improved,
    institutional_user_identity_improved as institutional_user_identity,
    pdf_encryption,
)


def _safe_text(value) -> str:
    if value in (None, ""):
        return "—"
    return escape(str(value))


def _format_datetime(value) -> str:
    if not value:
        return "—"
    return value.strftime("%d/%m/%Y %H:%M")


def _exam_name(smear: AcidFastSmear) -> str:
    test = getattr(smear.order_item, "test", None)
    return getattr(test, "name", None) or "Baciloscopia (pesquisa de BAAR)"


def _result_text(smear: AcidFastSmear) -> str:
    grade = smear.get_grade_display()
    count = (smear.afb_count or "").strip()
    if count:
        return f"{escape(grade)}<br/>{escape(count)}"
    return escape(grade)


def generate_afb_smear_pdf(smear: AcidFastSmear, request=None) -> tuple[bytes, str]:
    """Monta o PDF A5 do resultado de baciloscopia no padrão institucional."""
    buffer = io.BytesIO()
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

    order = smear.order_item.order
    patient = order.patient
    sample = smear.sample
    test = getattr(smear.order_item, "test", None)
    tenant = getattr(patient, "tenant", None) or getattr(smear, "tenant", None)
    tenant_name = getattr(tenant, "name", "CLÍNICA DE DIAGNÓSTICOS E SAÚDE")

    header_config = build_personalized_header(
        doc_type=DocumentType.LABORATORY_RESULT,
        tenant_name=tenant_name,
        logo_path=os.path.join(settings.BASE_DIR, "static", "img", "logo.png"),
    )
    doc.barcode_value = f"PAC:{getattr(patient, 'custom_id', '')}|RES:{smear.custom_id}"

    user_documento = smear.performed_by or getattr(order, "analyst", None)
    technician_text = institutional_user_identity(user_documento)

    left_lines = [
        f"{bold_text('Paciente')}: {_safe_text(patient.name)}",
        f"{bold_text('Documento')}: {_safe_text(getattr(patient, 'document_type', '—'))}: {_safe_text(getattr(patient, 'document_number', '') or 'Não forneceu documento')}",
        f"{bold_text('Contacto')}: {_safe_text(getattr(patient, 'contact', '') or '—')}",
        f"{bold_text('Amostra')}: {_safe_text(getattr(sample, 'barcode', '') or getattr(sample, 'sample_type', '') or '—')}",
    ]
    right_lines = [
        f"{bold_text('Requisição')}: {_safe_text(order.custom_id)}",
        f"{bold_text('Resultado')}: {_safe_text(smear.custom_id)}",
        f"{bold_text('Data dos Resultados')}: {_safe_text(_format_datetime(smear.performed_at or smear.created_at))}",
        f"{bold_text('Técn. de Laboratório')}: {_safe_text(technician_text)}",
    ]

    elements = [
        Paragraph("RESULTADO DE BACILOSCOPIA (BAAR)", title_style_improved()),
        Spacer(1, A5Margins.SECTION_SPACING),
        montar_bloco_identificacao(usable_width=usable_width, left_lines=left_lines, right_lines=right_lines),
        Spacer(1, A5Margins.SECTION_SPACING),
        HRFlowable(width="100%", thickness=0.5, color=header_config["sector_color"]),
        Spacer(1, A5Margins.SECTION_SPACING),
        Paragraph(escape(_exam_name(smear).upper()), section_style_improved(color=header_config["sector_color"])),
        Spacer(1, A5Margins.ROW_SPACING),
    ]

    is_positive = smear.grade != AcidFastSmear.Grade.NEGATIVE
    table = Table(
        [
            [cell_paragraph("Exame", True), cell_paragraph("Resultado", True)],
            [
                cell_paragraph(_exam_name(smear)),
                cell_paragraph(_result_text(smear), is_positive),
            ],
        ],
        colWidths=[usable_width * 0.42, usable_width * 0.58],
    )
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD_INST),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, header_config["sector_color"]),
            ]
        )
    )
    elements.append(table)

    detalhes = [f"Coloração: {smear.get_stain_display()}"]
    if smear.serial_number:
        detalhes.append(f"Amostra seriada: {smear.serial_number}ª")
    method = getattr(test, "method", None)
    if method:
        detalhes.append(f"Método: {method}")
    elements.extend([Spacer(1, A5Margins.ROW_SPACING), cell_paragraph(" · ".join(detalhes))])

    if (smear.notes or "").strip():
        elements.extend(
            [
                Spacer(1, A5Margins.ROW_SPACING),
                cell_paragraph(f"{bold_text('Observações')}: {_safe_text(smear.notes)}"),
            ]
        )

    append_fim(elements)

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

    surname = (patient.name or "").strip().split()[-1] if (patient.name or "").strip() else "paciente"
    filename = f"{smear.custom_id}_{surname}.pdf"
    return pdf_bytes, filename


gerar_pdf_baciloscopia = generate_afb_smear_pdf
