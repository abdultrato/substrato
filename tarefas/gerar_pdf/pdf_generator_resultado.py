import io

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
    identidade_usuario_institucional,
    estilo_titulo_documento,
    montar_bloco_identificacao,
    estilo_secao_documento,
    on_page,
)


def _formatar_data_resultados(requisicao):
    data = getattr(requisicao, "created_at", None) or getattr(requisicao, "criado_em", None)
    if not data:
        return "—"
    return data.strftime("%d/%m/%Y %H:%M")


def _nome_campo(exame_campo):
    return getattr(exame_campo, "nome_campo", None) or getattr(exame_campo, "nome", None) or "—"


def _valor_referencia(exame_campo):
    valor_referencia = getattr(exame_campo, "valor_referencia", None)
    if valor_referencia:
        return valor_referencia

    minimo = getattr(exame_campo, "valor_minimo", None)
    maximo = getattr(exame_campo, "valor_maximo", None)
    if minimo is not None or maximo is not None:
        return f"{minimo if minimo is not None else '—'} - {maximo if maximo is not None else '—'}"

    return "-"


def _resolver_usuario_documento(requisicao, resultados_qs):
    if resultados_qs:
        for resultado in resultados_qs:
            usuario_validador = getattr(resultado, "validado_por", None)
            if usuario_validador:
                return usuario_validador

    return (
        getattr(requisicao, "analista", None)
        or getattr(requisicao, "criado_por", None)
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

    paciente = requisicao.paciente
    resultados_qs = getattr(requisicao, "resultados", None) or getattr(requisicao, "resultadoitem_set", None)
    usuario_documento = _resolver_usuario_documento(requisicao, resultados_qs)

    left_lines = [
        f"{bold('Paciente')}: {paciente.nome}",
        f"{bold('Idade')}: {paciente.idade()} - {bold('Gênero')}: {paciente.genero or '—'} - {bold('Raça')}: {paciente.raca_origem}",
        f"{bold('Documento')}: {paciente.tipo_documento}: {paciente.numero_id or 'Não forneceu documento'}",
        f"{bold('Proveniência')}: {getattr(paciente, 'proveniencia', '__')}",
        f"{bold('Contacto e Whatsapp')}: {paciente.contacto or '—'}",
    ]

    tecnico_texto = identidade_usuario_institucional(usuario_documento)

    right_lines = [
        f"{bold('E-mail')}: {paciente.email or '—'}",
        f"{bold('Requisição')}: {requisicao.id_custom}",
        f"{bold('Data dos Resultados')}: {_formatar_data_resultados(requisicao)}",
        f"{bold('Técn. de Laboratório')}: {tecnico_texto}",
    ]

    style_title = estilo_titulo_documento("HeadingRes")
    style_section = estilo_secao_documento("section_res")

    elements.append(Paragraph("RESULTADOS DE ANÁLISES", style_title))
    elements.append(Spacer(1, 0.3 * cm))

    patient_table = montar_bloco_identificacao(
        usable_width=usable_width,
        left_lines=left_lines,
        right_lines=right_lines,
    )
    elements.append(patient_table)
    elements.append(Spacer(1, 0.3 * cm))

    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(Paragraph("ANÁLISES PROCESSADAS", style_section))
    elements.append(Spacer(1, 0.2 * cm))

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
            elements.append(Paragraph(exame_nome, style_section))
            elements.append(Spacer(1, 0.2 * cm))

            data = [
                [
                    cell_paragraph(getattr(resultados[0].exame_campo.exame, "metodo", "-"), is_bold=True),
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
                        cell_paragraph(_nome_campo(r.exame_campo)),
                        cell_paragraph(f"{valor} {r.exame_campo.unidade}" if valor not in (None, "") else "-"),
                        cell_paragraph(r.exame_campo.unidade or "-"),
                        cell_paragraph(_valor_referencia(r.exame_campo)),
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
        elements.append(cell_paragraph("Nenhum resultado disponível para esta requisição."))

    append_fim(elements)

    doc.build(
        elements,
        onFirstPage=lambda c, d: (on_page(c, d, usuario_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, usuario_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()
    filename = f"{requisicao.id_custom}_{requisicao.paciente.nome}.pdf"
    return pdf_bytes, filename
