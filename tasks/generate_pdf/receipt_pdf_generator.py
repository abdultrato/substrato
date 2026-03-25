from decimal import Decimal
import io
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

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

logger = logging.getLogger(__name__)


def _formatar_dt(value) -> str:
    if not value:
        return "—"
    try:
        return value.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return str(value)


def _item_code(item) -> str:
    exame = getattr(item, "exame", None) or getattr(item, "exame_medico", None)
    if not exame:
        return ""
    return getattr(exame, "codigo", "") or getattr(exame, "id_custom", "") or ""


def generate_receipt_pdf(recibo, request=None) -> tuple[bytes, str]:
    """
    Gera PDF A5 do Recibo (documento separado da fatura).

    Entrada: objeto Recibo
    Saída: (bytes_pdf, nome_arquivo)
    """

    buffer = io.BytesIO()

    # ==========================
    # A5 HARD GUARANTEE
    # ==========================
    page_width, _page_height = A5

    left_margin = 1.0 * cm
    right_margin = 1.0 * cm
    top_margin = 3.8 * cm
    bottom_margin = 2.0 * cm

    usable_width = page_width - (left_margin + right_margin)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        encrypt=pdf_encryption(),
    )

    story: list = []

    fatura = getattr(recibo, "fatura", None)
    pagamento = getattr(recibo, "pagamento", None)
    paciente = getattr(fatura, "paciente", None) if fatura else None

    # Código de barras no header (repete em todas páginas)
    try:
        doc.barcode_value = (
            f"PAC:{getattr(paciente, 'id_custom', '')}"
            f"|REC:{getattr(recibo, 'numero', '')}"
            f"|FAT:{getattr(fatura, 'id_custom', '') if fatura else ''}"
        )
    except Exception:
        doc.barcode_value = None

    usuario_documento = getattr(pagamento, "criado_por", None) or getattr(fatura, "criado_por", None)

    # ==========================
    # ESTILOS
    # ==========================
    style_title = document_title_style("HeadingRec")
    style_section = document_section_style("section_rec")

    # ==========================
    # CABEÇALHO DO DOCUMENTO
    # ==========================
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("RECIBO", style_title))
    story.append(Spacer(1, 0.2 * cm))

    # ==========================
    # BLOCO ESQUERDA (PACIENTE)
    # ==========================
    if paciente:
        idade = getattr(paciente, "idade", None)
        idade_txt = idade() if callable(idade) else "—"
        left_lines = [
            f"{bold('Paciente')}: {getattr(paciente, 'nome', '—')}",
            f"{bold('Idade')}: {idade_txt}  -  {bold('Gênero')}: {getattr(paciente, 'genero', '—') or '—'}",
            f"{bold('Documento')}: {getattr(paciente, 'tipo_documento', '—') or '—'}  {getattr(paciente, 'numero_id', '—') or '—'}",
            f"{bold('Contacto')}: {getattr(paciente, 'contacto', '—') or '—'}",
        ]
        if getattr(paciente, "email", None):
            left_lines.append(f"{bold('E-mail')}: {paciente.email or '—'}")
        if getattr(paciente, "proveniencia", None):
            left_lines.append(f"{bold('Proveniência')}: {getattr(paciente, 'proveniencia', '—') or '—'}")
    else:
        left_lines = [f"{bold('Paciente')}: —"]

    # ==========================
    # BLOCO DIREITA (RECIBO)
    # ==========================
    metodo_txt = ""
    status_txt = ""
    pago_em = None
    if pagamento:
        try:
            metodo_txt = pagamento.get_metodo_display()
        except Exception:
            metodo_txt = getattr(pagamento, "metodo", "") or ""
        try:
            status_txt = pagamento.get_status_display()
        except Exception:
            status_txt = getattr(pagamento, "status", "") or ""
        pago_em = getattr(pagamento, "pago_em", None)

    tecnico_texto = institutional_user_identity(usuario_documento)

    right_lines = [
        f"{bold('Recibo')}: {getattr(recibo, 'numero', '—')}",
        f"{bold('Fatura')}: {getattr(fatura, 'id_custom', '—') if fatura else '—'}",
        f"{bold('Pagamento')}: {getattr(pagamento, 'id_custom', getattr(pagamento, 'pk', '—')) if pagamento else '—'}",
        f"{bold('Método')}: {metodo_txt or '—'}",
        f"{bold('Status')}: {status_txt or '—'}",
        f"{bold('Pago em')}: {_formatar_dt(pago_em) if pago_em else _formatar_dt(getattr(recibo, 'criado_em', None))}",
        f"{bold('Emitido por')}: {tecnico_texto}",
    ]

    info_table = montar_bloco_identificacao(
        usable_width=usable_width,
        left_lines=left_lines,
        right_lines=right_lines,
    )

    story.append(info_table)
    story.append(Spacer(1, 0.15 * cm))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.darkblue))
    story.append(Spacer(1, 0.15 * cm))

    # ==========================
    # ITENS PAGOS (DA FATURA)
    # ==========================
    story.append(Paragraph("ITENS PAGOS", style_section))
    story.append(Spacer(1, 0.12 * cm))

    data = [
        [
            cell_paragraph("Descrição", is_bold=True),
            cell_paragraph("Qtd", is_bold=True),
            cell_paragraph("Preço", is_bold=True),
            cell_paragraph("Subtotal", is_bold=True),
        ]
    ]

    itens_qs = fatura.itens.select_related("exame", "exame_medico").all() if fatura else []
    subtotal_geral = Decimal("0.00")

    for item in itens_qs:
        qtd = getattr(item, "quantidade", Decimal("1.00")) or Decimal("1.00")
        preco_unit = getattr(item, "preco_unitario", Decimal("0.00")) or Decimal("0.00")
        try:
            qtd = Decimal(str(qtd))
        except Exception:
            qtd = Decimal("1.00")
        try:
            preco_unit = Decimal(str(preco_unit))
        except Exception:
            preco_unit = Decimal("0.00")

        total_linha = (qtd * preco_unit).quantize(Decimal("0.01"))
        subtotal_geral += total_linha

        codigo = _item_code(item)
        nome = ""
        exame = getattr(item, "exame", None) or getattr(item, "exame_medico", None)
        if exame:
            nome = getattr(exame, "nome", "") or ""
        exame_txt = f"{codigo.upper()} - {nome}" if codigo else (nome or "")
        descricao = getattr(item, "descricao", None) or exame_txt or "—"

        data.append(
            [
                cell_paragraph(descricao),
                cell_paragraph(f"{qtd}".replace(".", ",")),
                cell_paragraph(f"{preco_unit:,.2f} MZN".replace(",", " ")),
                cell_paragraph(f"{total_linha:,.2f} MZN".replace(",", " ")),
            ]
        )

    if fatura and not fatura.itens.exists():
        data.append([cell_paragraph("Nenhum item registrado.", is_bold=True), "", "", ""])

    table = Table(
        data,
        colWidths=[
            usable_width * 0.55,
            usable_width * 0.10,
            usable_width * 0.17,
            usable_width * 0.18,
        ],
    )

    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    story.append(table)
    story.append(Spacer(1, 0.18 * cm))

    # ==========================
    # RESUMO
    # ==========================
    total_sem_iva = getattr(fatura, "subtotal", None) if fatura else None
    total_iva = getattr(fatura, "iva_valor", None) if fatura else None
    total_com_iva = getattr(fatura, "total", None) if fatura else None

    def _as_money(v):
        if v is None:
            return "—"
        try:
            return f"{Decimal(str(v)):,.2f} MZN".replace(",", " ")
        except Exception:
            return f"{v} MZN"

    resumo = Table(
        [
            [cell_paragraph("Total sem IVA", is_bold=True), cell_paragraph(_as_money(total_sem_iva))],
            [cell_paragraph("Total de IVA", is_bold=True), cell_paragraph(_as_money(total_iva))],
            [
                cell_paragraph("Total pago", is_bold=True),
                cell_paragraph(_as_money(getattr(recibo, "valor", total_com_iva))),
            ],
        ],
        colWidths=[usable_width * 0.55, usable_width * 0.45],
    )
    resumo.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    story.append(Spacer(1, 0.15 * cm))
    story.append(Paragraph("RESUMO", style_section))
    story.append(Spacer(1, 0.10 * cm))
    story.append(resumo)

    append_fim(story)

    doc.build(
        story,
        onFirstPage=lambda c, d: (on_page(c, d, usuario_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, usuario_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    nome_paciente = getattr(paciente, "nome", "paciente").replace("/", "-") if paciente else "paciente"
    filename = f"{getattr(recibo, 'numero', 'recibo')}_{nome_paciente}.pdf"

    return pdf_bytes, filename


_codigo_item = _item_code
gerar_pdf_recibo = generate_receipt_pdf
