"""PDF institucional para resultado de cultura (microbiologia)."""

import io
import os
from xml.sax.saxutils import escape

from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
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

from apps.clinical_laboratory.models import MicrobiologyCulture

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

_OUTCOME_LABELS = {
    "positive": "Positiva",
    "negative": "Negativa",
    "contaminated": "Contaminada",
}


def _safe_text(value) -> str:
    if value in (None, ""):
        return "—"
    return escape(str(value))


def _format_datetime(value) -> str:
    if not value:
        return "—"
    return value.strftime("%d/%m/%Y %H:%M")


def _exam_name(culture: MicrobiologyCulture) -> str:
    test = getattr(culture.order_item, "test", None)
    return getattr(test, "name", None) or "Cultura microbiológica"


def _fmt_iso(value) -> str:
    if not value:
        return "—"
    dt = parse_datetime(value) if isinstance(value, str) else value
    if not dt:
        return "—"
    try:
        dt = timezone.localtime(dt)
    except Exception:
        pass
    return dt.strftime("%d/%m/%Y %H:%M")


def _fmt_hours(value) -> str | None:
    if value in (None, ""):
        return None
    try:
        h = float(value)
    except (TypeError, ValueError):
        return None
    return f"{int(h)}h" if h == int(h) else f"{h}h"


def _plate_label(plate: dict) -> str:
    code = plate.get("code") or "Meio"
    medium = plate.get("medium") or ""
    return escape(f"{code} — {medium}".strip(" —")) or escape(code)


def _plate_result(plate: dict) -> str:
    outcome = plate.get("outcome")
    if outcome in _OUTCOME_LABELS:
        parts = [_OUTCOME_LABELS[outcome]]
        result_text = (plate.get("result_text") or "").strip()
        if result_text and result_text != (plate.get("medium") or ""):
            parts.append(result_text)
        gram = plate.get("gram") or {}
        gram_txt = " · ".join(
            str(gram.get(k)) for k in ("result", "morphology", "arrangement") if gram.get(k)
        )
        if gram_txt:
            parts.append(gram_txt)
        return "<br/>".join(escape(p) for p in parts)

    # Em incubação: mostra o cronómetro individual deste meio (exatidão por placa).
    parts = ["Em incubação"]
    detail = []
    hours = _fmt_hours(plate.get("incubation_hours"))
    if hours:
        detail.append(f"Incubação {hours}")
    end = plate.get("incubation_expected_end_at")
    if end:
        detail.append(f"Leitura {_fmt_iso(end)}")
    if detail:
        parts.append(" · ".join(detail))
    return "<br/>".join(escape(p) for p in parts)


def generate_culture_result_pdf(culture: MicrobiologyCulture, request=None) -> tuple[bytes, str]:
    """Monta o PDF A5 do resultado de cultura no padrão institucional, com o
    estado e os dados exatos no momento da emissão."""
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

    order = culture.order_item.order
    patient = order.patient
    sample = culture.sample
    tenant = getattr(patient, "tenant", None) or getattr(culture, "tenant", None)
    tenant_name = getattr(tenant, "name", "CLÍNICA DE DIAGNÓSTICOS E SAÚDE")

    header_config = build_personalized_header(
        doc_type=DocumentType.LABORATORY_RESULT,
        tenant_name=tenant_name,
        logo_path=os.path.join(settings.BASE_DIR, "static", "img", "logo.png"),
    )
    doc.barcode_value = f"PAC:{getattr(patient, 'custom_id', '')}|RES:{culture.custom_id}"

    technician_text = institutional_user_identity(culture.performed_by or getattr(order, "analyst", None))
    now = timezone.localtime()

    left_lines = [
        f"{bold_text('Paciente')}: {_safe_text(patient.name)}",
        f"{bold_text('Documento')}: {_safe_text(getattr(patient, 'document_type', '—'))}: {_safe_text(getattr(patient, 'document_number', '') or 'Não forneceu documento')}",
        f"{bold_text('Contacto')}: {_safe_text(getattr(patient, 'contact', '') or '—')}",
        f"{bold_text('Amostra')}: {_safe_text(getattr(sample, 'barcode', '') or getattr(sample, 'sample_type', '') or '—')}",
    ]
    right_lines = [
        f"{bold_text('Requisição')}: {_safe_text(order.custom_id)}",
        f"{bold_text('Resultado')}: {_safe_text(culture.custom_id)}",
        f"{bold_text('Emitido em')}: {_safe_text(_format_datetime(now))}",
        f"{bold_text('Técn. de Laboratório')}: {_safe_text(technician_text)}",
    ]

    elements = [
        Paragraph(escape(_exam_name(culture).upper()), title_style_improved()),
        Spacer(1, A5Margins.SECTION_SPACING),
        montar_bloco_identificacao(usable_width=usable_width, left_lines=left_lines, right_lines=right_lines),
        Spacer(1, A5Margins.SECTION_SPACING),
        HRFlowable(width="100%", thickness=0.5, color=header_config["sector_color"]),
        Spacer(1, A5Margins.SECTION_SPACING),
    ]

    # Estado exato da cultura no momento da emissão.
    estado_linhas = [f"{bold_text('Estado')}: {_safe_text(culture.get_status_display())}"]
    if culture.incubation_started_at:
        estado_linhas.append(f"{bold_text('Início da incubação')}: {_safe_text(_format_datetime(timezone.localtime(culture.incubation_started_at)))}")
    if culture.incubation_expected_end_at:
        estado_linhas.append(f"{bold_text('Leitura prevista')}: {_safe_text(_format_datetime(timezone.localtime(culture.incubation_expected_end_at)))}")
    if culture.incubation_accumulated_hours:
        estado_linhas.append(f"{bold_text('Incubação acumulada')}: {_safe_text(f'{culture.incubation_accumulated_hours}h')}")
    for linha in estado_linhas:
        elements.append(cell_paragraph(linha))

    elements.extend(
        [
            Spacer(1, A5Margins.SECTION_SPACING),
            Paragraph("RESULTADO POR MEIO", section_style_improved(color=header_config["sector_color"])),
            Spacer(1, A5Margins.ROW_SPACING),
        ]
    )

    plates = culture.culture_plates or []
    table_rows = [[cell_paragraph("Meio", True), cell_paragraph("Resultado", True)]]
    if plates:
        for plate in plates:
            if not isinstance(plate, dict):
                continue
            is_positive = plate.get("outcome") in ("positive", "contaminated")
            table_rows.append(
                [cell_paragraph(_plate_label(plate)), cell_paragraph(_plate_result(plate), is_positive)]
            )
    else:
        table_rows.append([cell_paragraph("—"), cell_paragraph("Sem meios semeados")])

    table = Table(table_rows, colWidths=[usable_width * 0.42, usable_width * 0.58])
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

    if (culture.notes or "").strip():
        elements.extend(
            [
                Spacer(1, A5Margins.ROW_SPACING),
                cell_paragraph(f"{bold_text('Observações')}: {_safe_text(culture.notes)}"),
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
    filename = f"{culture.custom_id}_{surname}.pdf"
    return pdf_bytes, filename


gerar_pdf_cultura = generate_culture_result_pdf
