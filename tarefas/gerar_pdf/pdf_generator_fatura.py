import io
import logging
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle
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
    FONT,
    FONT_BOLD,
    NumberedCanvas,
    append_fim,
    bold,
    cell_paragraph,
    cell_style,
    draw_line_full_width,
    on_page,
)

logger = logging.getLogger(__name__)


def gerar_pdf_fatura(fatura, request=None) -> tuple[bytes, str]:
    """
    Gera PDF A5 da Fatura.
    Entrada: objeto Fatura
    Saída: (bytes_pdf, nome_arquivo)
    """

    buffer = io.BytesIO()

    # ==========================
    # A5 HARD GUARANTEE
    # ==========================
    page_width, page_height = A5

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
    )

    story = []

    # ==========================
    # DADOS BASE
    # ==========================
    paciente = getattr(fatura, "paciente", None)
    requisicao = getattr(fatura, "requisicao", None)
    analista = getattr(requisicao, "analista", None) if requisicao else None

    # ==========================
    # ESTILOS
    # ==========================
    style_title = ParagraphStyle(
        "HeadingFat",
        fontName=FONT_BOLD,
        fontSize=11,
        leading=14,
        textColor=colors.darkblue,
    )

    style_left = ParagraphStyle(
        "fat_left",
        fontName=FONT,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
    )

    style_right = ParagraphStyle(
        "fat_right",
        fontName=FONT,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
        alignment=TA_RIGHT,
    )

    style_section = ParagraphStyle(
        "section_fat",
        fontName=FONT_BOLD,
        fontSize=9,
        textColor=colors.darkblue,
    )

    # ==========================
    # CABEÇALHO DO DOCUMENTO
    # ==========================
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("FATURA / RECIBO", style_title))
    story.append(Spacer(1, 0.2 * cm))

    # ==========================
    # LINK DO PDF (opcional)
    # ==========================
    link_fatura: str | None = None
    try:
        if request:
            from django.urls import reverse

            link_fatura = request.build_absolute_uri(reverse("frontend:fatura_pdf", args=[fatura.id_custom]))
    except Exception:
        link_fatura = None

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
    # BLOCO DIREITA (FATURA)
    # ==========================
    tecnico_texto = "—"
    if analista:
        nome_real = getattr(analista, "get_full_name", lambda: "")() or ""
        apelido = getattr(analista, "apelido", "") or ""
        tecnico_texto = f"{nome_real} ({apelido})" if apelido else (nome_real or "—")

    data_requisicao = "—"
    if requisicao and getattr(requisicao, "created_at", None):
        try:
            data_requisicao = requisicao.created_at.strftime("%d/%m/%Y %H:%M")
        except Exception:
            data_requisicao = "—"

    right_lines = [
        f"{bold('Fatura')}: {getattr(fatura, 'id_custom', '—')}",
        f"{bold('Requisição')}: {getattr(requisicao, 'id_custom', '—') if requisicao else '—'}",
        f"{bold('Data')}: {data_requisicao}",
        f"{bold('Atendido por')}: {tecnico_texto}",
        f"{bold('Estado')}: {getattr(fatura, 'estado', '—')}",
    ]

    if link_fatura:
        right_lines.append(f"{bold('Link')}: <a href='{link_fatura}' color='blue'>{link_fatura}</a>")

    left_para = Paragraph("<br/>".join(left_lines), style_left)
    right_para = Paragraph("<br/>".join(right_lines), style_right)

    info_table = Table([[left_para, right_para]], colWidths=[usable_width * 0.62, usable_width * 0.38])
    info_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    story.append(info_table)
    story.append(Spacer(1, 0.15 * cm))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.darkblue))
    story.append(Spacer(1, 0.15 * cm))

    # ==========================
    # ITENS DA FATURA
    # ==========================
    story.append(Paragraph("ITENS DA FATURA", style_section))
    story.append(Spacer(1, 0.12 * cm))

    data = [
        [
            cell_paragraph("Descrição", is_bold=True),
            cell_paragraph("Qtd", is_bold=True),
            cell_paragraph("Preço", is_bold=True),
            cell_paragraph("Subtotal", is_bold=True),
        ]
    ]

    itens_qs = fatura.itens.select_related("exame").all()
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

        exame = getattr(item, "exame", None)
        exame_txt = ""
        if exame:
            codigo = getattr(exame, "codigo", "") or ""
            nome = getattr(exame, "nome", "") or ""
            exame_txt = f"{codigo.upper()} - {nome}" if codigo else nome

        descricao = getattr(item, "descricao", None) or exame_txt or "—"

        data.append(
            [
                cell_paragraph(descricao),
                cell_paragraph(f"{qtd}".replace(".", ",")),
                cell_paragraph(f"{preco_unit:,.2f} MZN".replace(",", " ")),
                cell_paragraph(f"{total_linha:,.2f} MZN".replace(",", " ")),
            ]
        )

    if not itens_qs.exists():
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
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.darkblue),
            ]
        )
    )

    story.append(KeepTogether(table))
    story.append(Spacer(1, 0.22 * cm))

    # ==========================
    # TOTAIS
    # ==========================
    desconto = getattr(fatura, "desconto", Decimal("0.00")) or Decimal("0.00")

    subtotal_model = getattr(fatura, "subtotal", None)
    total_model = getattr(fatura, "total", None)
    iva_model = getattr(fatura, "iva_valor", None)

    def fmt_money(v):
        try:
            v = Decimal(str(v)).quantize(Decimal("0.01"))
        except Exception:
            v = Decimal("0.00")
        return f"{v:,.2f} MZN".replace(",", " ")

    subtotal_final = subtotal_model if subtotal_model is not None else subtotal_geral
    total_final = total_model if total_model is not None else subtotal_geral

    totais_data = [
        [
            cell_paragraph("Subtotal:", is_bold=True),
            cell_paragraph(fmt_money(subtotal_final)),
        ]
    ]
    if iva_model is not None:
        totais_data.append([cell_paragraph("IVA:", is_bold=True), cell_paragraph(fmt_money(iva_model))])
    if desconto > 0:
        totais_data.append(
            [
                cell_paragraph("Desconto:", is_bold=True),
                cell_paragraph(fmt_money(desconto)),
            ]
        )
    totais_data.append(
        [
            cell_paragraph("TOTAL A PAGAR:", is_bold=True),
            cell_paragraph(fmt_money(total_final), is_bold=True),
        ]
    )

    totais_table = Table(totais_data, colWidths=[usable_width * 0.60, usable_width * 0.40])
    totais_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, colors.darkblue),
            ]
        )
    )

    story.append(totais_table)
    story.append(Spacer(1, 0.15 * cm))

    # ==========================
    # QR CODE
    # ==========================
    if link_fatura:
        try:
            import qrcode
            from reportlab.platypus import Image as RLImage

            qr = qrcode.QRCode(box_size=4, border=1)
            qr.add_data(link_fatura)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")

            qr_buf = io.BytesIO()
            img.save(qr_buf, format="PNG")
            qr_buf.seek(0)

            story.append(Spacer(1, 0.12 * cm))
            story.append(Paragraph("QR Code para acesso rápido à fatura:", cell_style))
            story.append(Spacer(1, 0.08 * cm))
            story.append(RLImage(qr_buf, width=2.3 * cm, height=2.3 * cm))
        except Exception as e:
            logger.warning("Falha ao gerar QR Code: %s", e)

    append_fim(story)

    # ==========================
    # BUILD PDF A5
    # ==========================
    doc.build(
        story,
        onFirstPage=lambda c, d: (on_page(c, d, analista), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, analista), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    nome_paciente = getattr(paciente, "nome", "paciente").replace("/", "-")
    filename = f"{fatura.id_custom}_{nome_paciente}.pdf"

    return pdf_bytes, filename
