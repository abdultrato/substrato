"""Geração do PDF da história clínica agregada do paciente."""

from collections.abc import Iterable
import io

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .pdf_base import (
    FONT,
    FONT_BOLD,
    NumberedCanvas,
    PDF_BODY_FONT_SIZE,
    PDF_BODY_LEADING,
    PDF_BOTTOM_MARGIN,
    PDF_HEADER_TOP_MARGIN,
    PDF_MARGIN,
    append_fim,
    bold,
    document_section_style,
    document_title_style,
    draw_line_full_width,
    institutional_user_identity,
    on_page,
    pdf_encryption,
)


def _first_value(source: dict | None, *keys: str, default: str = "—") -> str:
    if not isinstance(source, dict):
        return default
    for key in keys:
        value = source.get(key)
        if value is None:
            continue
        value_str = str(value).strip()
        if value_str:
            return value_str
    return default


def _fmt_date(value) -> str:
    if not value:
        return "—"
    try:
        from datetime import datetime

        date_obj = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return date_obj.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return str(value)


def _to_money(value) -> str:
    if value in (None, ""):
        return "—"
    try:
        amount = float(value)
        return f"{amount:,.2f}".replace(",", " ")
    except Exception:
        return str(value)


def _truncate(value, limit: int = 64) -> str:
    text = str(value or "").strip()
    if not text:
        return "—"
    if len(text) <= limit:
        return text
    return f"{text[:max(0, limit - 3)]}..."


def _style_minus_two(base_style: ParagraphStyle, name: str) -> ParagraphStyle:
    return ParagraphStyle(
        name=name,
        parent=base_style,
        fontSize=max(6, float(getattr(base_style, "fontSize", 9)) - 2),
        leading=max(7, float(getattr(base_style, "leading", 11)) - 2),
    )


def _build_identification_table(
    usable_width: float,
    left_lines: list[str],
    right_lines: list[str],
    left_style: ParagraphStyle,
    right_style: ParagraphStyle,
) -> Table:
    left_para = Paragraph("<br/>".join(left_lines), left_style)
    right_para = Paragraph("<br/>".join(right_lines), right_style)
    table = Table([[left_para, right_para]], colWidths=[usable_width * 0.62, usable_width * 0.38])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def _append_table(
    elements: list,
    title: str,
    headers: list[str],
    rows: Iterable[list[str]],
    usable_width: float,
    section_style,
    cell_style: ParagraphStyle,
    cell_bold_style: ParagraphStyle,
    col_widths_ratio: list[float] | None = None,
) -> None:
    elements.append(Paragraph(title, section_style))
    elements.append(Spacer(1, 0.12 * cm))

    data = [[Paragraph(str(header), cell_bold_style) for header in headers]]
    for row in rows:
        data.append([Paragraph(str(value), cell_style) for value in row])

    if len(data) == 1:
        data.append([Paragraph("Sem dados.", cell_bold_style)] + [Paragraph("", cell_style) for _ in headers[1:]])

    if col_widths_ratio and len(col_widths_ratio) == len(headers):
        total = sum(col_widths_ratio)
        col_widths = [usable_width * (ratio / total) for ratio in col_widths_ratio]
    else:
        col_widths = [usable_width / len(headers)] * len(headers)

    table = Table(data, colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 0.18 * cm))


def generate_patient_history_pdf(payload: dict, request=None) -> tuple[bytes, str]:
    """Gera PDF institucional de histórico do paciente.

    scope:
    - medical: histórico médico agregado (com financeiro)
    - invoices: apenas histórico de faturas
    - payments: apenas histórico de pagamentos/recibos
    """
    return _generate_patient_history_pdf(payload=payload, request=request, scope="medical")


def _generate_patient_history_pdf(payload: dict, request=None, scope: str = "medical") -> tuple[bytes, str]:
    allowed_scopes = {"medical", "invoices", "payments"}
    if scope not in allowed_scopes:
        raise ValueError(f"Escopo inválido para histórico do paciente: {scope}")

    buffer = io.BytesIO()

    page_width, _ = A5
    margin = PDF_MARGIN
    usable_width = page_width - (margin * 2)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=PDF_HEADER_TOP_MARGIN,
        bottomMargin=PDF_BOTTOM_MARGIN,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = False

    patient = (payload or {}).get("patient") or {}
    referencia = (payload or {}).get("referencia") or {}
    cardex = list((payload or {}).get("cardex") or [])
    requisicoes = list((payload or {}).get("requisicoes") or [])
    consultations = list((payload or {}).get("consultations") or [])
    procedures = list((payload or {}).get("procedures_enfermagem") or (payload or {}).get("procedimentos_enfermagem") or [])
    internamentos = list((payload or {}).get("internamentos_ward") or (payload or {}).get("internamentos_enfermaria") or [])
    vendas = list((payload or {}).get("vendas_farmacia") or [])
    faturas = list((payload or {}).get("faturas") or [])
    recibos = list((payload or {}).get("recibos") or [])
    pagamentos = list((payload or {}).get("pagamentos") or (payload or {}).get("payments") or [])

    patient_code = _first_value(patient, "id_custom", "custom_id", default="PAC-SEM-CODIGO")
    patient_doc = _first_value(patient, "numero_id", "document_number", default="")
    doc.barcode_value = f"PAC:{patient_code}|DOC:{patient_doc}"

    user_documento = (
        getattr(getattr(request, "user", None), "is_authenticated", False) and getattr(request, "user", None)
    ) or None

    elements: list = []

    title_style = document_title_style("HistoryTitle")
    section_style = document_section_style("HistorySection")
    cell_style = ParagraphStyle(
        "HistoryCellSmall",
        fontName=FONT,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_LEFT,
    )
    cell_bold_style = ParagraphStyle(
        "HistoryCellBoldSmall",
        fontName=FONT_BOLD,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_LEFT,
    )
    info_left_style = ParagraphStyle(
        "HistoryInfoLeftSmall",
        fontName=FONT,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        textColor=colors.HexColor("#333333"),
        alignment=TA_LEFT,
    )
    info_right_style = ParagraphStyle(
        "HistoryInfoRightSmall",
        fontName=FONT,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        textColor=colors.HexColor("#333333"),
        alignment=TA_RIGHT,
    )

    left_lines = [
        f"{bold('Paciente')}: {_first_value(patient, 'nome', 'name')}",
        f"{bold('Documento')}: {_first_value(patient, 'tipo_documento', 'document_type')} {_first_value(patient, 'numero_id', 'document_number')}",
        f"{bold('Género')}: {_first_value(patient, 'genero', 'gender')}",
        f"{bold('Contacto')}: {_first_value(patient, 'contacto', 'contact')}",
        f"{bold('Empresa')}: {_first_value(patient, 'empresa_origem_nome', 'origin_company_name')}",
    ]
    right_lines = [
        f"{bold('Código')}: {patient_code}",
        f"{bold('E-mail')}: {_first_value(patient, 'email')}",
        f"{bold('Criado em')}: {_fmt_date(_first_value(patient, 'criado_em', 'created_at', default=''))}",
        f"{bold('Pacientes vinculados')}: {_first_value(referencia, 'pacientes_vinculados', default='0')}",
        f"{bold('Emitido por')}: {institutional_user_identity(user_documento)}",
    ]

    titulo = {
        "medical": "HISTÓRICO CLÍNICO DO PACIENTE",
        "invoices": "HISTÓRICO DE FATURAS DO PACIENTE",
        "payments": "HISTÓRICO DE PAGAMENTOS DO PACIENTE",
    }[scope]
    elements.append(Paragraph(titulo, title_style))
    elements.append(Spacer(1, 0.25 * cm))
    elements.append(
        _build_identification_table(
            usable_width=usable_width,
            left_lines=left_lines,
            right_lines=right_lines,
            left_style=info_left_style,
            right_style=info_right_style,
        )
    )
    elements.append(Spacer(1, 0.20 * cm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    elements.append(Spacer(1, 0.20 * cm))

    summary_rows: list[list[str]] = []
    if scope == "medical":
        summary_rows = [
            ["Cardex", str(len(cardex))],
            ["Requisições", str(len(requisicoes))],
            ["Consultas", str(len(consultations))],
            ["Procedimentos de Enfermagem", str(len(procedures))],
            ["Internamentos", str(len(internamentos))],
            ["Vendas de Farmácia", str(len(vendas))],
            ["Faturas", str(len(faturas))],
            ["Pagamentos", str(len(pagamentos))],
            ["Recibos", str(len(recibos))],
        ]
    elif scope == "invoices":
        summary_rows = [["Faturas", str(len(faturas))]]
    else:
        summary_rows = [["Pagamentos", str(len(pagamentos))], ["Recibos", str(len(recibos))]]

    _append_table(
        elements,
        "Resumo de ocorrências",
        ["Secção", "Total"],
        summary_rows,
        usable_width,
        section_style,
        cell_style,
        cell_bold_style,
        [0.75, 0.25],
    )

    if scope == "medical":
        _append_table(
            elements,
            "Cardex (prontuário)",
            ["Início", "Médico", "Estado", "Diagnóstico"],
            [
                [
                    _fmt_date(item.get("inicio_atendimento") or item.get("care_start_at")),
                    _first_value(item, "medico_nome", "doctor_name"),
                    _first_value(item, "estado", "status"),
                    _truncate(item.get("diagnostico") or item.get("diagnosis")),
                ]
                for item in cardex
            ],
            usable_width,
            section_style,
            cell_style,
            cell_bold_style,
            [0.22, 0.24, 0.16, 0.38],
        )

        _append_table(
            elements,
            "Requisições",
            ["Código", "Setor", "Estado", "Criado em"],
            [
                [
                    _first_value(item, "id_custom", "custom_id", "id"),
                    _first_value(item, "tipo", "type"),
                    _first_value(item, "estado", "status"),
                    _fmt_date(item.get("criado_em") or item.get("created_at")),
                ]
                for item in requisicoes
            ],
            usable_width,
            section_style,
            cell_style,
            cell_bold_style,
            [0.22, 0.20, 0.20, 0.38],
        )

        _append_table(
            elements,
            "Consultas",
            ["Código", "Tipo", "Estado", "Data"],
            [
                [
                    _first_value(item, "id_custom", "custom_id", "id"),
                    _first_value(item, "tipo", "type"),
                    _first_value(item, "estado", "status"),
                    _fmt_date(item.get("agendada_para") or item.get("scheduled_for")),
                ]
                for item in consultations
            ],
            usable_width,
            section_style,
            cell_style,
            cell_bold_style,
            [0.22, 0.30, 0.18, 0.30],
        )

        _append_table(
            elements,
            "Enfermagem - procedimentos",
            ["Código", "Data", "Profissional", "Total"],
            [
                [
                    _first_value(item, "id_custom", "custom_id", "id"),
                    _fmt_date(item.get("data_realizacao") or item.get("performed_date")),
                    _first_value(item, "profissional", "professional"),
                    _to_money(item.get("total")),
                ]
                for item in procedures
            ],
            usable_width,
            section_style,
            cell_style,
            cell_bold_style,
            [0.22, 0.26, 0.30, 0.22],
        )

        _append_table(
            elements,
            "Enfermagem - internamentos",
            ["Enfermaria", "Cama", "Internamento", "Ativo"],
            [
                [
                    _first_value(item, "enfermaria_nome", "ward_name"),
                    _first_value(item, "cama_numero", "bed_number"),
                    _fmt_date(item.get("data_internamento") or item.get("admission_date")),
                    "Sim" if bool(item.get("ativo") or item.get("active")) else "Não",
                ]
                for item in internamentos
            ],
            usable_width,
            section_style,
            cell_style,
            cell_bold_style,
            [0.32, 0.14, 0.34, 0.20],
        )

        _append_table(
            elements,
            "Farmácia - vendas",
            ["Número", "Total", "Criado em"],
            [
                [
                    _first_value(item, "numero", "number", "id_custom", "custom_id", "id"),
                    _to_money(item.get("total")),
                    _fmt_date(item.get("criado_em") or item.get("created_at")),
                ]
                for item in vendas
            ],
            usable_width,
            section_style,
            cell_style,
            cell_bold_style,
            [0.36, 0.24, 0.40],
        )

    if scope in {"medical", "invoices"}:
        _append_table(
            elements,
            "Financeiro - faturas",
            ["Código", "Estado", "Total", "Criado em"],
            [
                [
                    _first_value(item, "id_custom", "custom_id", "id"),
                    _first_value(item, "estado", "status"),
                    _to_money(item.get("total") or item.get("total_a_pagar")),
                    _fmt_date(item.get("criado_em") or item.get("created_at")),
                ]
                for item in faturas
            ],
            usable_width,
            section_style,
            cell_style,
            cell_bold_style,
            [0.22, 0.18, 0.22, 0.38],
        )

    if scope in {"medical", "payments"}:
        _append_table(
            elements,
            "Financeiro - pagamentos",
            ["ID", "Fatura", "Método", "Estado", "Valor", "Pago em"],
            [
                [
                    _first_value(item, "id_custom", "custom_id", "id"),
                    _first_value(item, "codigo_fatura", "invoice_code", "fatura", "invoice"),
                    _first_value(item, "metodo", "method"),
                    _first_value(item, "estado", "status"),
                    _to_money(item.get("valor") or item.get("value")),
                    _fmt_date(item.get("pago_em") or item.get("paid_at") or item.get("criado_em") or item.get("created_at")),
                ]
                for item in pagamentos
            ],
            usable_width,
            section_style,
            cell_style,
            cell_bold_style,
            [0.14, 0.14, 0.14, 0.14, 0.14, 0.30],
        )

        _append_table(
            elements,
            "Financeiro - recibos",
            ["Número", "Fatura", "Valor", "Criado em"],
            [
                [
                    _first_value(item, "numero", "number", "id"),
                    _first_value(item, "fatura_codigo", "invoice_code", "fatura", "invoice"),
                    _to_money(item.get("valor") or item.get("value")),
                    _fmt_date(item.get("criado_em") or item.get("created_at")),
                ]
                for item in recibos
            ],
            usable_width,
            section_style,
            cell_style,
            cell_bold_style,
            [0.22, 0.20, 0.20, 0.38],
        )

    append_fim(elements)

    doc.build(
        elements,
        onFirstPage=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    patient_name = _first_value(patient, "nome", "name", default="paciente").replace("/", "-")
    prefix = {
        "medical": "historia_clinica",
        "invoices": "historia_faturas",
        "payments": "historia_pagamentos",
    }[scope]
    filename = f"{prefix}_{patient_code}_{patient_name}.pdf"
    return pdf_bytes, filename


def generate_patient_history_pdf_by_scope(payload: dict, request=None, scope: str = "medical") -> tuple[bytes, str]:
    """Permite geração por escopo específico de histórico do paciente."""
    return _generate_patient_history_pdf(payload=payload, request=request, scope=scope)


gerar_pdf_historia_clinica = generate_patient_history_pdf
