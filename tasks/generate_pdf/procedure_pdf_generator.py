"""Geração de PDF institucional do procedimento de enfermagem com cabeçalhos personalizados."""

from __future__ import annotations

from decimal import Decimal
import io
import os

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.pharmacy.models.product import Product

from .institutional_pdf_design import (
    FONT_BOLD_INST,
    ImprovedInstitutionalNumberedCanvas as NumberedCanvas,
    append_fim,
    institutional_cell_paragraph as cell_paragraph,
    institutional_draw_line_full_width_improved as draw_line_full_width,
    institutional_user_identity_improved as institutional_user_identity,
    institutional_montar_bloco_identificacao as montar_bloco_identificacao,
    improved_institutional_on_page as on_page,
    pdf_encryption,
    institutional_title_style,
    institutional_section_style,
    institutional_a5_margins as A5Margins,
    institutional_document_type as DocumentType,
    institutional_bold_text as bold_text,
    build_institutional_header_config as build_personalized_header,
    draw_institutional_header_improved as draw_header_improved,
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
    sector_color=colors.HexColor("#D32F2F"),
):
    section_style = institutional_section_style(color=sector_color, name="ProcedureSection")
    elements.append(Paragraph(title, section_style))
    elements.append(Spacer(1, A5Margins.ROW_SPACING))

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
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD_INST),
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
    elements.append(Spacer(1, A5Margins.SECTION_SPACING))


def _collect_unique_invoices(procedure):
    unique: dict[int, object] = {}

    for invoice in procedure.invoices.filter(deleted=False).order_by("created_at", "id"):
        unique[invoice.pk] = invoice
    for invoice in procedure.invoices_legacy.filter(deleted=False).order_by("created_at", "id"):
        unique[invoice.pk] = invoice

    return list(unique.values())


def generate_procedure_pdf(procedure, request=None) -> tuple[bytes, str]:
    """Monta e devolve o PDF do procedimento de enfermagem com cabeçalho personalizado."""
    buffer = io.BytesIO()

    # Usar margens institucionais padronizadas
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

    # Configurar cabeçalho institucional
    tenant = getattr(procedure.patient, "tenant", None) if procedure.patient else None
    tenant_name = getattr(tenant, "name", "SERVIÇO DE ENFERMAGEM")

    header_config = build_personalized_header(
        doc_type=DocumentType.NURSING_PROCEDURE,
        tenant_name=tenant_name,
        logo_path=os.path.join(settings.BASE_DIR, "static", "img", "logo.png"),
    )
    doc.header_config = header_config

    # Código de barras no header (repete em todas páginas)
    try:
        doc.barcode_value = (
            f"PROC:{_text(getattr(procedure, 'custom_id', None), default=getattr(procedure, 'pk', None))}"
            f"|PAC:{_text(getattr(getattr(procedure, 'patient', None), 'custom_id', None), default=getattr(procedure, 'patient_id', None))}"
        )
    except Exception:
        doc.barcode_value = None

    patient = procedure.patient
    user_documento = _resolve_document_user(procedure, request=request)

    story: list = []
    story.append(Paragraph("RELATÓRIO DE PROCEDIMENTO DE ENFERMAGEM", institutional_title_style(color=header_config["sector_color"])))
    story.append(Spacer(1, A5Margins.SECTION_SPACING))

    professionals = [_person_name(prof) for prof in procedure.professional.all()]
    professionals_text = ", ".join(professionals) if professionals else "Sem profissional associado"

    left_lines = [
        f"{bold_text('Procedimento')}: {_text(procedure.custom_id, default=str(procedure.pk))}",
        f"{bold_text('Paciente')}: {_text(patient.name)}",
        f"{bold_text('Data de realização')}: {_dt(procedure.performed_date)}",
        f"{bold_text('Fluxo')}: {_text(getattr(procedure, 'get_workflow_status_display', lambda: '')() or procedure.workflow_status)}",
        f"{bold_text('Faturação')}: {_text(getattr(procedure, 'get_billing_status_display', lambda: '')() or procedure.billing_status)}",
        f"{bold_text('Profissionais')}: {_text(professionals_text)}",
    ]
    right_lines = [
        f"{bold_text('Executado em')}: {_dt(procedure.executed_at)}",
        f"{bold_text('Concluído em')}: {_dt(procedure.completed_at)}",
        f"{bold_text('Faturado em')}: {_dt(procedure.billed_at)}",
        f"{bold_text('Emitido por')}: {institutional_user_identity(user_documento)}",
        f"{bold_text('Gerado em')}: {_dt(timezone.now())}",
    ]
    story.append(
        montar_bloco_identificacao(
            usable_width=usable_width,
            left_lines=left_lines,
            right_lines=right_lines,
        )
    )
    story.append(Spacer(1, A5Margins.SECTION_SPACING))

    if (procedure.notes or "").strip():
        story.append(Paragraph(
            f"{bold_text('Observações')}: {_text(procedure.notes)}",
            institutional_section_style(color=header_config["sector_color"], name="ProcedureNotes")
        ))
        story.append(Spacer(1, A5Margins.ROW_SPACING))

    # Linha divisória com cor do setor (vermelho para enfermagem)
    story.append(HRFlowable(
        width="100%",
        thickness=0.5,
        color=header_config["sector_color"]
    ))
    story.append(Spacer(1, A5Margins.ROW_SPACING))

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
        sector_color=header_config["sector_color"],
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
        sector_color=header_config["sector_color"],
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
    filename = f"procedimento_{_text(procedure.custom_id, default=str(procedure.pk))}.pdf"
    return pdf_bytes, filename


gerar_pdf_procedure = generate_procedure_pdf
