from decimal import Decimal
import io
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
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
    FONT_BOLD,
    NumberedCanvas,
    append_fim,
    bold,
    cell_paragraph,
    draw_line_full_width,
    estilo_secao_documento,
    estilo_titulo_documento,
    identidade_usuario_institucional,
    montar_bloco_identificacao,
    on_page,
    pdf_encryption,
)

from apps.billing.models.invoice_items import InvoiceItem

logger = logging.getLogger(__name__)


def _formatar_data_requisicao(requisicao):
    if not requisicao:
        return "—"

    data = getattr(requisicao, "created_at", None) or getattr(requisicao, "criado_em", None)
    if not data:
        return "—"

    try:
        return data.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return "—"


def _codigo_exame(exame):
    return getattr(exame, "codigo", "") or getattr(exame, "id_custom", "") or ""


def _resolver_usuario_documento(fatura, requisicao):
    return (
        getattr(fatura, "criado_por", None)
        or getattr(requisicao, "criado_por", None)
        or getattr(requisicao, "analista", None)
    )


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

    story = []

    # ==========================
    # DADOS BASE
    # ==========================
    paciente = getattr(fatura, "paciente", None)
    requisicao = getattr(fatura, "requisicao", None)
    usuario_documento = _resolver_usuario_documento(fatura, requisicao)

    # Código de barras no header (repete em todas páginas)
    try:
        doc.barcode_value = f"PAC:{getattr(paciente, 'id_custom', '')}|FAT:{getattr(fatura, 'id_custom', '')}"
    except Exception:
        doc.barcode_value = None

    # ==========================
    # ESTILOS
    # ==========================
    style_title = estilo_titulo_documento("HeadingFat")
    style_section = estilo_secao_documento("section_fat")

    # ==========================
    # CABEÇALHO DO DOCUMENTO
    # ==========================
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("FATURA", style_title))
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

        empresa_origem = getattr(paciente, "empresa_origem", None)
        empresa_solicitante = getattr(requisicao, "empresa_solicitante", None) if requisicao else None
        empresa_executora = getattr(requisicao, "empresa_executora_externa", None) if requisicao else None
        if empresa_solicitante:
            left_lines.append(f"{bold('Empresa solicitante')}: {getattr(empresa_solicitante, 'nome', '—')}")
        elif empresa_origem:
            left_lines.append(f"{bold('Empresa')}: {getattr(empresa_origem, 'nome', '—')}")
        if empresa_executora:
            left_lines.append(f"{bold('Executora externa')}: {getattr(empresa_executora, 'nome', '—')}")
    else:
        left_lines = [f"{bold('Paciente')}: —"]

    # ==========================
    # BLOCO DIREITA (FATURA)
    # ==========================
    tecnico_texto = identidade_usuario_institucional(usuario_documento)

    data_requisicao = _formatar_data_requisicao(requisicao)

    right_lines = [
        f"{bold('Fatura')}: {getattr(fatura, 'id_custom', '—')}",
        f"{bold('Requisição')}: {getattr(requisicao, 'id_custom', '—') if requisicao else '—'}",
        f"{bold('Data')}: {data_requisicao}",
        f"{bold('Técn. de Laboratório')}: {tecnico_texto}",
        f"{bold('Estado')}: {getattr(fatura, 'estado', '—')}",
    ]

    if link_fatura:
        right_lines.append(f"{bold('Link')}: <a href='{link_fatura}' color='blue'>{link_fatura}</a>")

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
    # ITENS DA FATURA
    # ==========================
    story.append(Paragraph("ITENS DA FATURA", style_section))
    story.append(Spacer(1, 0.12 * cm))

    itens = list(fatura.itens.select_related("exame", "exame_medico").filter(deletado=False))
    subtotal_geral = Decimal("0.00")

    for item in itens:
        subtotal_geral += item.total_sem_iva or Decimal("0.00")

    section_defs = [
        ("Exames", lambda i: i.tipo_item == InvoiceItem.TipoItem.EXAME),
        ("Exames Médicos", lambda i: i.tipo_item == InvoiceItem.TipoItem.EXAME_MEDICO),
        (
            "Consultas",
            lambda i: i.tipo_item == InvoiceItem.TipoItem.AJUSTE
            and i.descricao
            and "consulta" in i.descricao.lower(),
        ),
        (
            "Procedimentos",
            lambda i: i.tipo_item
            in {
                InvoiceItem.TipoItem.PROCEDIMENTO_ITEM,
                InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL,
            },
        ),
        ("Medicação", lambda i: i.tipo_item == InvoiceItem.TipoItem.ITEM_VENDA),
    ]

    assigned = set()
    header = [
        cell_paragraph("Descrição", is_bold=True),
        cell_paragraph("Qtd", is_bold=True),
        cell_paragraph("Preço", is_bold=True),
        cell_paragraph("% IVA", is_bold=True),
        cell_paragraph("Valor IVA", is_bold=True),
        cell_paragraph("Subtotal (sem IVA)", is_bold=True),
    ]

    def fmt_money(value):
        try:
            value = Decimal(str(value)).quantize(Decimal("0.01"))
        except Exception:
            value = Decimal("0.00")
        return f"{value:,.2f} MZN".replace(",", " ")

    def fmt_quant(value):
        try:
            value = Decimal(str(value))
        except Exception:
            value = Decimal("1.00")
        return f"{value.normalize():f}".replace(".", ",")

    def fmt_percent(value):
        try:
            value = Decimal(str(value))
        except Exception:
            value = Decimal("0.00")
        return f"{value:,.2f}%".replace(",", " ")

    for label, predicate in section_defs:
        section_items = [item for item in itens if predicate(item)]
        for item in section_items:
            assigned.add(item.pk)
        if not section_items:
            continue

        story.append(Paragraph(label, style_section))
        story.append(Spacer(1, 0.08 * cm))

        rows = [header]
        for item in section_items:
            qtd = getattr(item, "quantidade", Decimal("1.00")) or Decimal("1.00")
            preco_unit = getattr(item, "preco_unitario", Decimal("0.00")) or Decimal("0.00")
            descricao = getattr(item, "descricao", None) or "—"
            percentual = getattr(item, "iva_percentual", Decimal("0.00")) or Decimal("0.00")
            valor_iva = getattr(item, "iva_valor", Decimal("0.00")) or Decimal("0.00")
            subtotal_item = getattr(item, "total_sem_iva", Decimal("0.00")) or Decimal("0.00")

            rows.append(
                [
                    cell_paragraph(descricao),
                    cell_paragraph(fmt_quant(qtd)),
                    cell_paragraph(fmt_money(preco_unit)),
                    cell_paragraph(fmt_percent(percentual)),
                    cell_paragraph(fmt_money(valor_iva)),
                    cell_paragraph(fmt_money(subtotal_item)),
                ]
            )

        table = Table(
            rows,
            colWidths=[
                usable_width * 0.40,
                usable_width * 0.10,
                usable_width * 0.13,
                usable_width * 0.12,
                usable_width * 0.13,
                usable_width * 0.12,
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
        story.append(Spacer(1, 0.15 * cm))

    remaining = [item for item in itens if item.pk not in assigned]
    if remaining:
        story.append(Paragraph("Outros itens", style_section))
        story.append(Spacer(1, 0.08 * cm))
        rows = [header]
        for item in remaining:
            qtd = getattr(item, "quantidade", Decimal("1.00")) or Decimal("1.00")
            preco_unit = getattr(item, "preco_unitario", Decimal("0.00")) or Decimal("0.00")
            descricao = getattr(item, "descricao", None) or "—"
            percentual = getattr(item, "iva_percentual", Decimal("0.00")) or Decimal("0.00")
            valor_iva = getattr(item, "iva_valor", Decimal("0.00")) or Decimal("0.00")
            subtotal_item = getattr(item, "total_sem_iva", Decimal("0.00")) or Decimal("0.00")

            rows.append(
                [
                    cell_paragraph(descricao),
                    cell_paragraph(fmt_quant(qtd)),
                    cell_paragraph(fmt_money(preco_unit)),
                    cell_paragraph(fmt_percent(percentual)),
                    cell_paragraph(fmt_money(valor_iva)),
                    cell_paragraph(fmt_money(subtotal_item)),
                ]
            )

        table = Table(
            rows,
            colWidths=[
                usable_width * 0.40,
                usable_width * 0.10,
                usable_width * 0.13,
                usable_width * 0.12,
                usable_width * 0.13,
                usable_width * 0.12,
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
        story.append(Spacer(1, 0.15 * cm))

    if not itens:
        story.append(cell_paragraph("Nenhum item registrado.", is_bold=True))
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

    subtotal_sem_iva = subtotal_model if subtotal_model is not None else subtotal_geral
    total_com_iva = total_model if total_model is not None else subtotal_sem_iva + (iva_model or Decimal("0.00"))
    valor_total_iva = iva_model if iva_model is not None else max(total_com_iva - subtotal_sem_iva, Decimal("0.00"))
    total_a_pagar_sem_iva = max(subtotal_sem_iva - desconto, Decimal("0.00"))

    totais_data = [
        [
            cell_paragraph("Subtotal com desconto de IVA:", is_bold=True),
            cell_paragraph(fmt_money(subtotal_sem_iva)),
        ],
        [cell_paragraph("Valor total do IVA:", is_bold=True), cell_paragraph(fmt_money(valor_total_iva))],
    ]
    if desconto > 0:
        totais_data.append(
            [
                cell_paragraph("Desconto:", is_bold=True),
                cell_paragraph(fmt_money(desconto)),
            ]
        )
    totais_data.append(
        [
            cell_paragraph("Total sem desconto de IVA:", is_bold=True),
            cell_paragraph(fmt_money(total_com_iva)),
        ]
    )
    totais_data.append(
        [
            cell_paragraph("TOTAL A PAGAR (sem IVA):", is_bold=True),
            cell_paragraph(fmt_money(total_a_pagar_sem_iva), is_bold=True),
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
            story.append(cell_paragraph("QR Code para acesso rápido à fatura:"))
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
        onFirstPage=lambda c, d: (on_page(c, d, usuario_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, usuario_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    nome_paciente = getattr(paciente, "nome", "paciente").replace("/", "-")
    filename = f"{fatura.id_custom}_{nome_paciente}.pdf"

    return pdf_bytes, filename
