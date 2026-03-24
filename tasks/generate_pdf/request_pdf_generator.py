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
    NumberedCanvas,
    append_fim,
    bold,
    cell_paragraph,
    draw_line_full_width,
    document_section_style,
    document_title_style,
    institutional_user_identity,
    montar_bloco_identificacao,
    on_page,
    pdf_encryption,
)


def _format_request_date(requisicao):
    data = getattr(requisicao, "created_at", None) or getattr(requisicao, "criado_em", None)
    if not data:
        return "—"
    return data.strftime("%d/%m/%Y %H:%M")


def _exam_code(exam):
    return getattr(exam, "codigo", None) or getattr(exam, "id_custom", None) or "—"


def _resolve_document_user(requisicao):
    return getattr(requisicao, "criado_por", None) or getattr(requisicao, "analista", None)


def generate_request_pdf(requisicao) -> tuple[bytes, str]:
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
        bottomMargin=2 * cm,
        encrypt=pdf_encryption(),
    )

    # Código de barras no header (repete em todas páginas)
    try:
        paciente = requisicao.paciente
        doc.barcode_value = f"PAC:{getattr(paciente, 'id_custom', '')}|REQ:{getattr(requisicao, 'id_custom', '')}"
    except Exception:
        doc.barcode_value = None

    story = []

    style_title = document_title_style("HeadingReq")

    story.append(Spacer(1, 0.6 * cm))
    paciente = requisicao.paciente
    eh_externa = bool(
        getattr(requisicao, "empresa_solicitante_id", None)
        or getattr(requisicao, "empresa_executora_externa_id", None)
        or getattr(paciente, "empresa_origem_id", None)
    )
    story.append(
        Paragraph(
            "REQUISIÇÃO EXTERNA DE SERVIÇOS" if eh_externa else "REQUISIÇÃO DE EXAMES",
            style_title,
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    idade = getattr(paciente, "idade", lambda: "—")()
    usuario_documento = _resolve_document_user(requisicao)

    left_lines = [
        f"{bold('Paciente')}: {paciente.nome}",
        f"{bold('Idade')}: {idade}   -  {bold('Gênero')}: {paciente.genero or '—'}   -  {bold('Raça')}: {paciente.raca_origem or '—'}",
        f"{bold('Documento')}: {paciente.tipo_documento or '—'}    {paciente.numero_id or '—'}",
        f"{bold('Proveniência')}: {getattr(paciente, 'proveniencia', '—')}",
        f"{bold('Contacto e Whatsapp')}: {paciente.contacto or '—'}",
    ]

    empresa_origem = getattr(paciente, "empresa_origem", None)
    empresa_solicitante = getattr(requisicao, "empresa_solicitante", None)
    empresa_executora = getattr(requisicao, "empresa_executora_externa", None)
    if empresa_solicitante:
        left_lines.append(f"{bold('Empresa solicitante')}: {getattr(empresa_solicitante, 'nome', '—')}")
    elif empresa_origem:
        left_lines.append(f"{bold('Empresa')}: {getattr(empresa_origem, 'nome', '—')}")
    if empresa_executora:
        left_lines.append(f"{bold('Executora externa')}: {getattr(empresa_executora, 'nome', '—')}")

    tecnico_texto = institutional_user_identity(usuario_documento)

    right_lines = [
        f"{bold('E-mail')}: {paciente.email or '—'}",
        f"{bold('Requisição')}: {requisicao.id_custom}",
        f"{bold('Data da Requisição')}: {_format_request_date(requisicao)}",
        f"{bold('Técn. de Laboratório')}: {tecnico_texto}",
    ]

    patient_table = montar_bloco_identificacao(
        usable_width=usable_width,
        left_lines=left_lines,
        right_lines=right_lines,
    )
    story.append(patient_table)
    story.append(Spacer(1, 0.3 * cm))

    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.darkblue))
    story.append(Spacer(1, 0.2 * cm))

    style_section = document_section_style("section_title")
    story.append(Paragraph("EXAMES REQUISITADOS", style_section))
    story.append(Spacer(1, 0.2 * cm))

    exames = requisicao.exames.all()
    exames_data = (
        [
            [
                cell_paragraph(
                    f"{bold('Código')}: {_exam_code(e)} - {bold('Nome')}: {e.nome.capitalize()} - {bold('Método')}: {e.metodo.capitalize()}"
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
        onFirstPage=lambda c, d: (on_page(c, d, usuario_documento), draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (on_page(c, d, usuario_documento), draw_line_full_width(c, d)),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()
    filename = f"{requisicao.id_custom}_{requisicao.paciente.nome}.pdf"
    return pdf_bytes, filename


_codigo_exame = _exam_code
_formatar_data_requisicao = _format_request_date
_resolver_usuario_documento = _resolve_document_user
gerar_pdf_requisicao = generate_request_pdf
