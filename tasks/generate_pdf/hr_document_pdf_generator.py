"""Documentos institucionais de Recursos Humanos (guias de marcha e licenças)."""

from __future__ import annotations

import io
import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .institutional_pdf_design import (
    FONT_INST,
    ImprovedInstitutionalNumberedCanvas as NumberedCanvas,
    append_fim,
    build_institutional_header_config as build_personalized_header,
    institutional_a5_margins as A5Margins,
    institutional_bold_text as bold_text,
    institutional_document_type as DocumentType,
    institutional_draw_line_full_width_improved as draw_line_full_width,
    institutional_section_style,
    institutional_title_style,
    improved_institutional_on_page as on_page,
    pdf_encryption,
)

# Tipos de documento de RH suportados.
HR_DOCUMENT_TYPES: dict[str, dict] = {
    "guia_marcha_ferias": {
        "title": "GUIA DE MARCHA — FÉRIAS",
        "subtitle": "Guia de Marcha de Férias",
        "body": (
            "Declara-se, para os devidos efeitos, que o(a) funcionário(a) acima identificado(a) "
            "se encontra autorizado(a) a gozar o respetivo período de férias, nos termos da "
            "legislação laboral em vigor e do regulamento interno da instituição. "
            "Durante o período de gozo de férias, o(a) funcionário(a) fica dispensado(a) das "
            "suas funções, mantendo todos os direitos e regalias inerentes ao vínculo laboral."
        ),
        "needs_period": True,
    },
    "guia_marcha_dispensa": {
        "title": "GUIA DE MARCHA — DISPENSA",
        "subtitle": "Guia de Marcha de Dispensa",
        "body": (
            "Declara-se, para os devidos efeitos, que o(a) funcionário(a) acima identificado(a) "
            "se encontra dispensado(a) do serviço no período abaixo indicado, com conhecimento "
            "e autorização do Departamento de Recursos Humanos, devendo retomar as suas funções "
            "no primeiro dia útil após o termo da dispensa."
        ),
        "needs_period": True,
    },
    "licenca_maternidade": {
        "title": "LICENÇA DE MATERNIDADE",
        "subtitle": "Licença de Maternidade",
        "body": (
            "Declara-se, para os devidos efeitos, que à funcionária acima identificada é "
            "concedida licença de maternidade, nos termos da legislação laboral em vigor, "
            "com manutenção da remuneração e demais direitos previstos. A funcionária deverá "
            "apresentar a documentação clínica de suporte junto do Departamento de Recursos "
            "Humanos e retomar as suas funções no primeiro dia útil após o termo da licença."
        ),
        "needs_period": True,
        "gender": "F",
    },
    "licenca_paternidade": {
        "title": "LICENÇA DE PATERNIDADE",
        "subtitle": "Licença de Paternidade",
        "body": (
            "Declara-se, para os devidos efeitos, que ao funcionário acima identificado é "
            "concedida licença de paternidade, nos termos da legislação laboral em vigor, "
            "com manutenção da remuneração e demais direitos previstos. O funcionário deverá "
            "apresentar a documentação de suporte junto do Departamento de Recursos Humanos "
            "e retomar as suas funções no primeiro dia útil após o termo da licença."
        ),
        "needs_period": True,
        "gender": "M",
    },
    "licenca_doenca": {
        "title": "LICENÇA POR DOENÇA",
        "subtitle": "Licença por Doença",
        "body": (
            "Declara-se, para os devidos efeitos, que ao(à) funcionário(a) acima identificado(a) "
            "é concedida licença por doença, mediante apresentação de atestado médico válido, "
            "nos termos da legislação laboral e do sistema de segurança social em vigor. "
            "O(a) funcionário(a) deverá manter o Departamento de Recursos Humanos informado "
            "sobre a evolução do seu estado e retomar as funções após alta clínica."
        ),
        "needs_period": True,
    },
}


def _text(value, default: str = "—") -> str:
    if value is None:
        return default
    txt = str(value).strip()
    return txt if txt else default


def _date(value) -> str:
    if not value:
        return "____/____/______"
    try:
        return value.strftime("%d/%m/%Y")
    except Exception:
        return _text(value)


def validate_hr_document_for_employee(employee, doc_type: str) -> dict:
    spec = HR_DOCUMENT_TYPES.get(doc_type)
    if not spec:
        raise ValidationError({"tipo": "Tipo de documento de RH inválido."})

    required_gender = spec.get("gender")
    if required_gender and (employee.gender or "").upper() != required_gender:
        if required_gender == "F":
            raise ValidationError("Licença de maternidade aplica-se apenas a funcionárias.")
        raise ValidationError("Licença de paternidade aplica-se apenas a funcionários.")
    return spec


def generate_hr_document_pdf(
    employee,
    doc_type: str,
    *,
    start_date=None,
    end_date=None,
    notes: str = "",
    request=None,
) -> tuple[bytes, str]:
    """Gera o documento de RH no padrão institucional (header do Departamento de RH)."""
    spec = validate_hr_document_for_employee(employee, doc_type)

    buffer = io.BytesIO()
    usable_width = A5Margins.usable_width()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=A5Margins.LEFT,
        rightMargin=A5Margins.RIGHT,
        topMargin=A5Margins.TOP,
        bottomMargin=A5Margins.BOTTOM,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = False

    tenant = getattr(employee, "tenant", None)
    header_config = build_personalized_header(
        doc_type=DocumentType.HR_DOCUMENT,
        tenant_name=getattr(tenant, "name", "") or "DEPARTAMENTO DE RECURSOS HUMANOS",
        logo_path=os.path.join(settings.BASE_DIR, "static", "img", "logo.png"),
    )
    # Descrição do documento conforme o tipo em causa.
    header_config["sector_subtitle"] = spec["subtitle"]
    doc.header_config = header_config

    try:
        doc.barcode_value = f"RH:{_text(employee.custom_id, default=employee.pk)}|DOC:{doc_type.upper()}"
    except Exception:
        doc.barcode_value = None

    body_style = ParagraphStyle(
        "hr_body",
        fontName=FONT_INST,
        fontSize=9,
        leading=14,
        alignment=4,  # justificado
    )

    story: list = []
    story.append(Paragraph(spec["title"], institutional_title_style(color=header_config["sector_color"])))
    story.append(Spacer(1, A5Margins.SECTION_SPACING))

    story.append(Paragraph("Identificação do funcionário", institutional_section_style(color=header_config["sector_color"])))
    ident_rows = [
        [Paragraph(f"{bold_text('Nome')}: {_text(employee.name)}", body_style),
         Paragraph(f"{bold_text('Código')}: {_text(employee.custom_id)}", body_style)],
        [Paragraph(f"{bold_text('Cargo')}: {_text(getattr(getattr(employee, 'role', None), 'name', None))}", body_style),
         Paragraph(f"{bold_text('Profissão')}: {_text(getattr(getattr(employee, 'profession', None), 'name', None))}", body_style)],
        [Paragraph(f"{bold_text('NUIT')}: {_text(employee.nuit)}", body_style),
         Paragraph(f"{bold_text('Nº INSS')}: {_text(employee.inss_number)}", body_style)],
        [Paragraph(f"{bold_text('Data de admissão')}: {_date(employee.admission_date)}", body_style),
         Paragraph(f"{bold_text('Documento')}: {_text(employee.document_type)} {_text(employee.document_number, default='')}", body_style)],
    ]
    ident = Table(ident_rows, colWidths=[usable_width / 2, usable_width / 2])
    ident.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(ident)
    story.append(Spacer(1, A5Margins.SECTION_SPACING))

    story.append(Paragraph("Declaração", institutional_section_style(color=header_config["sector_color"])))
    story.append(Paragraph(spec["body"], body_style))
    story.append(Spacer(1, A5Margins.SECTION_SPACING))

    if spec.get("needs_period"):
        story.append(Paragraph(
            f"{bold_text('Período')}: de {_date(start_date)} a {_date(end_date)}",
            body_style,
        ))
        story.append(Spacer(1, 6))

    if (notes or "").strip():
        story.append(Paragraph(f"{bold_text('Observações')}: {_text(notes)}", body_style))
        story.append(Spacer(1, 6))

    issued = timezone.localdate().strftime("%d/%m/%Y")
    story.append(Paragraph(f"Emitido em {issued}.", body_style))
    story.append(Spacer(1, 28))

    sign_rows = [[
        Paragraph("_______________________________<br/>O Departamento de Recursos Humanos", body_style),
        Paragraph("_______________________________<br/>O(A) Funcionário(a)", body_style),
    ]]
    sign = Table(sign_rows, colWidths=[usable_width / 2, usable_width / 2])
    sign.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(sign)

    append_fim(story)

    user_documento = getattr(request, "user", None)
    doc.build(
        story,
        onFirstPage=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    surname = (_text(employee.name, default="funcionario").split() or ["funcionario"])[-1]
    filename = f"{doc_type}_{_text(employee.custom_id, default=str(employee.pk))}_{surname}.pdf"
    return pdf_bytes, filename
