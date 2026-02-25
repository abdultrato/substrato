import io

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
    bold_style,
    cell_paragraph,
    cell_style,
    draw_line_full_width,
    on_page,
)


def gerar_pdf_resultados(requisicao, apenas_validados: bool = False) -> tuple[bytes, str]:
    buffer = io.BytesIO()
    page_width, _ = A5
    min_margin = 1 * cm
    usable_width = page_width - 2 * min_margin

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=min_margin,
        rightMargin=min_margin,
        topMargin=3.8 * cm,
        bottomMargin=2.0 * cm,
    )

    elements = []

    style_left = ParagraphStyle(
        "patient_left",
        fontName=FONT,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
    )
    style_right = ParagraphStyle(
        "patient_right",
        fontName=FONT,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
        alignment=TA_RIGHT,
    )

    paciente = requisicao.paciente
    analista = requisicao.analista

    left_lines = [
        f"{bold('Paciente')}: {paciente.nome}",
        f"{bold('Idade')}: {paciente.idade()} - {bold('Gênero')}: {paciente.genero or '—'} - {bold('Raça')}: {paciente.raca_origem}",
        f"{bold('Documento')}: {paciente.tipo_documento}: {paciente.numero_id or 'Não forneceu documento'}",
        f"{bold('Proveniência')}: {getattr(paciente, 'proveniencia', '__')}",
        f"{bold('Contacto e Whatsapp')}: {paciente.contacto or '—'}",
    ]

    if analista:
        nome_real = getattr(analista, "get_full_name", lambda: "")()
        apelido = getattr(analista, "apelido", "")
        tecnico_texto = f"{nome_real} ({apelido})" if apelido else nome_real
    else:
        tecnico_texto = "—"

    right_lines = [
        f"{bold('E-mail')}: {paciente.email or '—'}",
        f"{bold('Requisição')}: {requisicao.id_custom}",
        f"{bold('Data dos Resultados')}: {requisicao.created_at.strftime('%d/%m/%Y %H:%M')}",
        f"{bold('Técn. de Laboratório')}: {tecnico_texto or '—'}",
    ]

    left_para = Paragraph("<br/>".join(left_lines), style_left)
    right_para = Paragraph("<br/>".join(right_lines), style_right)

    patient_table = Table([[left_para, right_para]], colWidths=[usable_width * 0.62, usable_width * 0.38])
    patient_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    elements.append(patient_table)
    elements.append(Spacer(1, 0.3 * cm))

    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    elements.append(Spacer(1, 0.3 * cm))

    style_title = ParagraphStyle(
        "HeadingRes",
        fontName=FONT_BOLD,
        fontSize=11,
        leading=14,
        textColor=colors.darkblue,
    )
    elements.append(Paragraph("RESULTADOS DE ANÁLISES", style_title))
    elements.append(Spacer(1, 0.3 * cm))

    resultados_qs = getattr(requisicao, "resultados", None) or getattr(requisicao, "resultadoitem_set", None)

    if resultados_qs:
        qs = resultados_qs.select_related("exame_campo__exame")
        if apenas_validados:
            qs = qs.filter(validado=True)

        exames_agrupados = {}
        for r in qs:
            exame = r.exame_campo.exame
            exames_agrupados.setdefault(exame.nome, []).append(r)

        for exame_nome, resultados in exames_agrupados.items():
            elements.append(Spacer(1, 0.2 * cm))
            elements.append(Paragraph(exame_nome, bold_style))
            elements.append(Spacer(1, 0.2 * cm))

            data = [
                [
                    cell_paragraph(resultados[0].exame_campo.exame.metodo, is_bold=True),
                    cell_paragraph("Resultado", is_bold=True),
                    cell_paragraph("Unidade", is_bold=True),
                    cell_paragraph("Valor de Ref.", is_bold=True),
                ]
            ]

            for r in resultados:
                valor = getattr(r, "resultado", None)
                if valor in (None, ""):
                    for attr in (
                        "valor_texto",
                        "valor_numerico",
                        "valor_percentagem",
                        "valor_escolha",
                    ):
                        v = getattr(r, attr, None)
                        if v not in (None, ""):
                            valor = v
                            break

                data.append(
                    [
                        cell_paragraph(r.exame_campo.nome_campo),
                        cell_paragraph(f"{valor} {r.exame_campo.unidade}" if valor not in (None, "") else "-"),
                        cell_paragraph(r.exame_campo.unidade or "-"),
                        cell_paragraph(r.exame_campo.valor_referencia or "-"),
                    ]
                )

            table = Table(
                data,
                colWidths=[
                    usable_width * 0.40,
                    usable_width * 0.30,
                    usable_width * 0.15,
                    usable_width * 0.15,
                ],
            )
            table.setStyle(
                TableStyle(
                    [
                        ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                        ("ALIGN", (1, 1), (-1, -1), "LEFT"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 2),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                    ]
                )
            )
            elements.append(KeepTogether(table))
            elements.append(Spacer(1, 0.3 * cm))
    else:
        elements.append(Paragraph("Nenhum resultado disponível para esta requisição.", cell_style))

    append_fim(elements)

    doc.build(
        elements,
        onFirstPage=lambda c, d: (on_page(c, d, analista), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, analista), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()
    filename = f"{requisicao.id_custom}_{requisicao.paciente.nome}.pdf"
    return pdf_bytes, filename
