"""Geração de PDF institucional do procedimento de enfermagem realizado."""

from __future__ import annotations

import io
from decimal import Decimal

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.pharmacy.models.product import Product
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


def _text(value, default: str = "—") -> str:
    if value is None:
        return default
    txt = str(value).strip()
    return txt if txt else default


def _money(value) -> str:
    if value is None:
        value = Decimal("0.00")
    try:
        amount = Decimal(value).quantize(Decimal("0.01"))
    except Exception:
        amount = Decimal("0.00")
    return f"{amount:.2f}"


def _dt(value) -> str:
    if not value:
        return "—"
    try:
        if timezone.is_aware(value):
            value = timezone.localtime(value)
        return value.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return _text(value)


def _person_name(user) -> str:
    if not user:
        return "—"
    full_name = ""
    if hasattr(user, "get_full_name"):
        full_name = (user.get_full_name() or "").strip()
    if not full_name:
        full_name = getattr(user, "name", "") or getattr(user, "username", "")
    return full_name or _text(getattr(user, "pk", None))


def _resolve_document_user(procedure, request=None):
    user = getattr(request, "user", None)
    if getattr(user, "is_authenticated", False):
        return user
    return getattr(procedure, "updated_by", None) or getattr(procedure, "created_by", None)


def _append_table(
    elements: list,
    title: str,
    headers: list[str],
    rows: list[list[str]],
    usable_width: float,
    col_widths: list[float] | None = None,
):
    section_style = document_section_style("ProcedureSection")
    elements.append(Paragraph(title, section_style))
    elements.append(Spacer(1, 0.10 * cm))

    data = [[cell_paragraph(h, is_bold=True) for h in headers]]
    for row in rows:
        data.append([cell_paragraph(col) for col in row])
    if len(data) == 1:
        data.append([cell_paragraph("Sem dados.", is_bold=True)] + [cell_paragraph("") for _ in headers[1:]])

    widths = col_widths if col_widths else [usable_width / len(headers)] * len(headers)
    table = Table(data, colWidths=widths)
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


def _collect_unique_invoices(procedure):
    unique: dict[int, object] = {}

    for invoice in procedure.invoices.filter(deleted=False).order_by("created_at", "id"):
        unique[invoice.pk] = invoice
    for invoice in procedure.invoices_legacy.filter(deleted=False).order_by("created_at", "id"):
        unique[invoice.pk] = invoice

    return list(unique.values())


def generate_procedure_pdf(procedure, request=None) -> tuple[bytes, str]:
    """Monta e devolve o PDF do procedimento de enfermagem em bytes."""
    buffer = io.BytesIO()
    page_width, _ = A5
    margin = 1 * cm
    usable_width = page_width - (2 * margin)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=3.8 * cm,
        bottomMargin=2.0 * cm,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = False
    doc.barcode_value = (
        f"PROC:{_text(getattr(procedure, 'custom_id', None), default=getattr(procedure, 'pk', None))}"
        f"|PAC:{_text(getattr(getattr(procedure, 'patient', None), 'custom_id', None), default=getattr(procedure, 'patient_id', None))}"
    )

    patient = procedure.patient
    user_documento = _resolve_document_user(procedure, request=request)

    story: list = []
    title_style = document_title_style("ProcedureTitle")
    story.append(Paragraph("RELATÓRIO DE PROCEDIMENTO DE ENFERMAGEM", title_style))
    story.append(Spacer(1, 0.22 * cm))

    professionals = [_person_name(prof) for prof in procedure.professional.all()]
    professionals_text = ", ".join(professionals) if professionals else "Sem profissional associado"

    left_lines = [
        f"{bold('Procedimento')}: {_text(procedure.custom_id, default=str(procedure.pk))}",
        f"{bold('Paciente')}: {_text(patient.name)}",
        f"{bold('Data de realização')}: {_dt(procedure.performed_date)}",
        f"{bold('Fluxo')}: {_text(getattr(procedure, 'get_workflow_status_display', lambda: '')() or procedure.workflow_status)}",
        f"{bold('Faturação')}: {_text(getattr(procedure, 'get_billing_status_display', lambda: '')() or procedure.billing_status)}",
        f"{bold('Profissionais')}: {_text(professionals_text)}",
    ]
    right_lines = [
        f"{bold('Executado em')}: {_dt(procedure.executed_at)}",
        f"{bold('Concluído em')}: {_dt(procedure.completed_at)}",
        f"{bold('Faturado em')}: {_dt(procedure.billed_at)}",
        f"{bold('Emitido por')}: {institutional_user_identity(user_documento)}",
        f"{bold('Gerado em')}: {_dt(timezone.now())}",
    ]
    story.append(
        montar_bloco_identificacao(
            usable_width=usable_width,
            left_lines=left_lines,
            right_lines=right_lines,
        )
    )
    story.append(Spacer(1, 0.18 * cm))

    if (procedure.notes or "").strip():
        story.append(Paragraph(f"{bold('Observações')}: {_text(procedure.notes)}", document_section_style("ProcedureNotes")))
        story.append(Spacer(1, 0.16 * cm))

    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    story.append(Spacer(1, 0.16 * cm))

    items = list(
        procedure.itens.filter(deleted=False).select_related("catalog", "value").order_by("created_at", "id")
    )
    item_rows: list[list[str]] = []
    for item in items:
        unit_price = getattr(getattr(item, "value", None), "unit_price", None) or item.unit_price or Decimal("0.00")
        item_rows.append(
            [
                _text(item.custom_id, default=str(item.pk)),
                _text(item.description or getattr(getattr(item, "catalog", None), "name", None)),
                _text(item.quantity, default="0"),
                _text(getattr(item, "get_execution_status_display", lambda: "")() or item.execution_status),
                _money(unit_price),
                _money(item.total_linha),
            ]
        )

    _append_table(
        story,
        "Atos/Serviços realizados",
        ["Código", "Descrição", "Qtd", "Estado", "Preço Unit.", "Total"],
        item_rows,
        usable_width,
        col_widths=[usable_width * 0.13, usable_width * 0.33, usable_width * 0.08, usable_width * 0.14, usable_width * 0.16, usable_width * 0.16],
    )

    materials = list(
        procedure.materiais.filter(deleted=False)
        .select_related("product", "lot", "procedure_item", "value")
        .order_by("created_at", "id")
    )
    medication_rows: list[list[str]] = []
    material_rows: list[list[str]] = []
    for material in materials:
        unit_cost = getattr(getattr(material, "value", None), "unit_cost", None) or material.unit_cost or Decimal("0.00")
        base_row = [
            _text(material.custom_id, default=str(material.pk)),
            _text(getattr(material.product, "name", None)),
            _text(getattr(material.lot, "lot_number", None)),
            _text(material.quantity, default="0"),
            _money(unit_cost),
            _money(material.total_linha),
        ]
        if material.product and material.product.type == Product.ProductType.MEDICAMENTO:
            medication_rows.append(base_row)
        else:
            material_rows.append(base_row)

    _append_table(
        story,
        "Medicação usada",
        ["Código", "Medicamento", "Lote", "Qtd", "Custo Unit.", "Total"],
        medication_rows,
        usable_width,
        col_widths=[usable_width * 0.13, usable_width * 0.33, usable_width * 0.12, usable_width * 0.08, usable_width * 0.17, usable_width * 0.17],
    )

    _append_table(
        story,
        "Material usado",
        ["Código", "Material", "Lote", "Qtd", "Custo Unit.", "Total"],
        material_rows,
        usable_width,
        col_widths=[usable_width * 0.13, usable_width * 0.33, usable_width * 0.12, usable_width * 0.08, usable_width * 0.17, usable_width * 0.17],
    )

    invoices = _collect_unique_invoices(procedure)
    total_invoice = Decimal("0.00")
    total_paid = Decimal("0.00")
    invoice_rows: list[list[str]] = []
    payment_rows: list[list[str]] = []
    for invoice in invoices:
        invoice_total = getattr(invoice, "total_a_pagar", None) or getattr(invoice, "total", None) or Decimal("0.00")
        paid_amount = invoice.confirmed_paid_amount() or Decimal("0.00")
        balance = (Decimal(invoice_total) - Decimal(paid_amount)).quantize(Decimal("0.01"))

        total_invoice += Decimal(invoice_total)
        total_paid += Decimal(paid_amount)

        invoice_rows.append(
            [
                _text(invoice.custom_id, default=str(invoice.pk)),
                _text(getattr(invoice, "get_status_display", lambda: "")() or invoice.status),
                _money(invoice_total),
                _money(paid_amount),
                _money(balance),
            ]
        )

        payments = invoice.pagamentos.filter(deleted=False).order_by("-created_at", "-id")
        for payment in payments:
            payment_rows.append(
                [
                    _text(invoice.custom_id, default=str(invoice.pk)),
                    _text(payment.custom_id, default=str(payment.pk)),
                    _text(getattr(payment, "get_method_display", lambda: "")() or payment.method),
                    _text(getattr(payment, "get_status_display", lambda: "")() or payment.status),
                    _money(payment.net_value()),
                    _dt(payment.paid_at or payment.created_at),
                ]
            )

    summary_rows = [
        ["Subtotal serviços", _money(procedure.services_subtotal)],
        ["Subtotal materiais", _money(procedure.materials_subtotal)],
        ["Total do procedimento", _money(procedure.total)],
        ["Total faturado", _money(total_invoice)],
        ["Valor pago (confirmado)", _money(total_paid)],
        ["Saldo em aberto", _money((total_invoice - total_paid).quantize(Decimal("0.01")))],
    ]
    _append_table(
        story,
        "Resumo financeiro",
        ["Indicador", "Valor (MZN)"],
        summary_rows,
        usable_width,
        col_widths=[usable_width * 0.70, usable_width * 0.30],
    )

    _append_table(
        story,
        "Faturas associadas ao procedimento",
        ["Fatura", "Estado", "Total", "Pago", "Saldo"],
        invoice_rows,
        usable_width,
        col_widths=[usable_width * 0.22, usable_width * 0.22, usable_width * 0.18, usable_width * 0.18, usable_width * 0.20],
    )

    _append_table(
        story,
        "Pagamentos registados",
        ["Fatura", "Pagamento", "Método", "Estado", "Valor líquido", "Data"],
        payment_rows,
        usable_width,
        col_widths=[usable_width * 0.14, usable_width * 0.17, usable_width * 0.16, usable_width * 0.16, usable_width * 0.18, usable_width * 0.19],
    )

    prescriptions = list(
        patient.prescricoes_enfermagem.filter(deleted=False, active=True).order_by("-prescription_date", "-id")[:5]
    )
    prescription_rows = [
        [
            _dt(prescription.prescription_date),
            _text(prescription.description),
        ]
        for prescription in prescriptions
    ]
    _append_table(
        story,
        "Prescrições ativas relacionadas ao paciente",
        ["Data", "Descrição"],
        prescription_rows,
        usable_width,
        col_widths=[usable_width * 0.28, usable_width * 0.72],
    )

    append_fim(story)

    doc.build(
        story,
        onFirstPage=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, user_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()
    filename = f"procedimento_{_text(procedure.custom_id, default=str(procedure.pk))}.pdf"
    return pdf_bytes, filename


gerar_pdf_procedure = generate_procedure_pdf
