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
    cell_paragraph,
    draw_line_full_width,
    on_page,
)


def gerar_pdf_requisicao(requisicao) -> tuple[bytes, str]:
    buffer = io.BytesIO()
    page_width, _ = A5
    min_margin = 1 * cm
    usable_width = page_width - 2 * min_margin

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=min_margin,
        rightMargin=min_margin,
        topMargin=3 * cm,
        bottomMargin=2 * cm,
    )

    story = []

    style_title = ParagraphStyle(
        "HeadingReq",
        fontName=FONT_BOLD,
        fontSize=11,
        leading=14,
        textColor=colors.darkblue,
    )

    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph("REQUISIÇÃO DE EXAMES", style_title))
    story.append(Spacer(1, 0.3 * cm))

    paciente = requisicao.paciente
    idade = getattr(paciente, "idade", lambda: "—")()
    analista = requisicao.analista

    style_left = ParagraphStyle(
        "req_left",
        fontName=FONT,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
    )
    style_right = ParagraphStyle(
        "req_right",
        fontName=FONT,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
        alignment=TA_RIGHT,
    )

    left_lines = [
        f"{bold('Paciente')}: {paciente.nome}",
        f"{bold('Idade')}: {idade}   -  {bold('Gênero')}: {paciente.genero or '—'}   -  {bold('Raça')}: {paciente.raca_origem or '—'}",
        f"{bold('Documento')}: {paciente.tipo_documento or '—'}    {paciente.numero_id or '—'}",
        f"{bold('Proveniência')}: {getattr(paciente, 'proveniencia', '—')}",
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
        f"{bold('Data da Requisição')}: {requisicao.created_at.strftime('%d/%m/%Y %H:%M')}",
        f"{bold('Analista Clínico')}: {tecnico_texto or '—'}",
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
    story.append(patient_table)
    story.append(Spacer(1, 0.3 * cm))

    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    story.append(Spacer(1, 0.2 * cm))

    style_section = ParagraphStyle("section_title", fontName=FONT_BOLD, fontSize=9, textColor=colors.darkblue)
    story.append(Paragraph("EXAMES REQUISITADOS", style_section))
    story.append(Spacer(1, 0.2 * cm))

    exames = requisicao.exames.all()
    exames_data = (
        [
            [
                cell_paragraph(
                    f"{bold('Código')}: {e.codigo.upper()} - {bold('Nome')}: {e.nome.capitalize()} - {bold('Método')}: {e.metodo.capitalize()}"
                )
            ]
            for e in exames
        ]
        if exames.exists()
        else [[cell_paragraph("Nenhum exame registrado.", is_bold=True)]]
    )

    tabela_exames = Table(exames_data, colWidths=[usable_width])
    tabela_exames.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    story.append(KeepTogether(tabela_exames))

    append_fim(story)

    doc.build(
        story,
        onFirstPage=lambda c, d: (on_page(c, d, analista), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, analista), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()
    filename = f"{requisicao.id_custom}_{requisicao.paciente.nome}.pdf"
    return pdf_bytes, filename
