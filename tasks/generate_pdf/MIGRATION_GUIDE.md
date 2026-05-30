"""
GUIA DE MIGRAÇÃO: Usando PDF Improvements

Este arquivo demonstra como adaptar os geradores PDF existentes para usar
as novas melhorias de cabeçalho personalizado, fontes otimizadas e margens.

========================================================
ANTES (método atual):
========================================================

from .pdf_base import (
FONT_BOLD,
NumberedCanvas,
append_fim,
bold,
cell_paragraph,
document_title_style,
draw_line_full_width,
institutional_user_identity,
montar_bloco_identificacao,
on_page,
pdf_encryption,
)

def generate*results_pdf(request, apenas_validados=True) -> tuple[bytes, str]:
buffer = io.BytesIO()
page_width, * = A5
margin = 1 _ cm # Margens não otimizadas
usable_width = page_width - (margin _ 2)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=3.8 * cm,
        bottomMargin=2.0 * cm,
    )

    # Cabeçalho genérico (não personalizado)
    # on_page() desenha sempre o mesmo...

========================================================
DEPOIS (com melhorias):
========================================================

from .pdf_improvements import (
A5Margins,
DocumentType,
bold_text,
build_personalized_header,
cell_style_improved,
draw_header_improved,
section_style_improved,
title_style_improved,
FONT_IMPROVED,
FONT_IMPROVED_BOLD,
)
from .pdf_base import (
NumberedCanvas,
append_fim,
cell_paragraph,
draw_line_full_width,
institutional_user_identity,
montar_bloco_identificacao,
pdf_encryption,
)

def generate_results_pdf(request, apenas_validados=True) -> tuple[bytes, str]:
buffer = io.BytesIO()

    # Usar margens otimizadas para A5
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

    # Obter tenant (se disponível) para personalizar instituição
    patient = request.patient
    tenant = getattr(patient, "tenant", None)
    tenant_name = getattr(tenant, "name", "CLÍNICA DE DIAGNÓSTICOS")

    # Construir cabeçalho personalizado
    header_config = build_personalized_header(
        doc_type=DocumentType.LABORATORY_RESULT,
        tenant_name=tenant_name,
        logo_path=os.path.join(settings.BASE_DIR, "static", "img", "logo.png"),
    )

    # Usar estilos melhorados
    elements = []
    elements.append(Paragraph("RESULTADOS DE ANÁLISES", title_style_improved()))
    elements.append(Spacer(1, A5Margins.SECTION_SPACING))

    # ... resto do código ...

    # Desenhar cabeçalho personalizado
    doc.build(
        elements,
        onFirstPage=lambda c, d: (
            draw_header_improved(c, d, header_config),
            draw_line_full_width(c, d),
        ),
        onLaterPages=lambda c, d: (
            draw_header_improved(c, d, header_config),
            draw_line_full_width(c, d),
        ),
        canvasmaker=NumberedCanvas,
    )

========================================================
PASSOS DE MIGRAÇÃO:
========================================================

1. IMPORTE AS NOVAS FUNÇÕES
   from .pdf_improvements import (
   A5Margins,
   DocumentType,
   build_personalized_header,
   draw_header_improved,
   title_style_improved,
   section_style_improved,
   FONT_IMPROVED,
   FONT_IMPROVED_BOLD,
   )

2. ATUALIZE AS MARGENS

   # Antes:

   margin = 1 _ cm
   usable_width = page_width - (margin _ 2)

   # Depois:

   usable_width = A5Margins.usable_width()

3. CRIE O SIMPLEDOCTEMPLATE COM NOVAS MARGENS
   doc = SimpleDocTemplate(
   buffer,
   pagesize=A5,
   leftMargin=A5Margins.LEFT,
   rightMargin=A5Margins.RIGHT,
   topMargin=A5Margins.TOP,
   bottomMargin=A5Margins.BOTTOM,
   encrypt=pdf_encryption(),
   )

4. OBTENHA INFORMAÇÕES DO TENANT
   patient = request.patient
   tenant = getattr(patient, "tenant", None)
   tenant_name = getattr(tenant, "name", "CLÍNICA DE DIAGNÓSTICOS")

5. CONSTRUA O CABEÇALHO PERSONALIZADO
   header_config = build_personalized_header(
   doc_type=DocumentType.LABORATORY_RESULT, # ou outro tipo
   tenant_name=tenant_name,
   logo_path=...,
   )

6. ATUALIZE ESTILOS PARA VERSÕES MELHORADAS

   # Antes:

   style_title = document_title_style("HeadingRes")

   # Depois:

   style_title = title_style_improved()

7. ATUALIZE O HOOK onFirstPage/onLaterPages
   doc.build(
   elements,
   onFirstPage=lambda c, d: draw_header_improved(c, d, header_config),
   onLaterPages=lambda c, d: draw_header_improved(c, d, header_config),
   canvasmaker=NumberedCanvas,
   )

========================================================
TIPOS DE DOCUMENTO SUPORTADOS:
========================================================

DocumentType.LABORATORY_RESULT # Azul Laboratorial (#004B87)
DocumentType.NURSING_PROCEDURE # Vermelho Enfermagem (#D32F2F)
DocumentType.MEDICAL_REPORT # Azul Médico (#1976D2)
DocumentType.PHARMACY_REPORT # Verde Farmácia (#388E3C)
DocumentType.INVOICE # Laranja Faturação (#F57C00)
DocumentType.RECEIPT # Roxo Recepção (#7B1FA2)
DocumentType.ACTIVITY_REPORT # Azul-esverdeado (#00838F)
DocumentType.PATIENT_HISTORY # Vermelho Escuro (#C62828)
DocumentType.ANALYTICS # Ciano (#0097A7)
DocumentType.REQUEST # Cinza Azulado (#455A64)

Cada tipo tem cores, subtítulos e ícones específicos!

========================================================
FONTES OTIMIZADAS:
========================================================

FONT_IMPROVED # Calibri (ou Segoe/Liberation fallback)
FONT_IMPROVED_BOLD # Calibri Bold

Muito mais legível em documentos clínicos do que o padrão!
As fontes são escolhidas automaticamente em ordem de preferência:

1. Calibri (Microsoft, preferida)
2. Segoe UI (fallback Microsoft)
3. Helvetica (fallback universal)

========================================================
MARGENS OTIMIZADAS PARA A5:
========================================================

A5Margins.LEFT # 0.8 cm (margens mínimas)
A5Margins.RIGHT # 0.8 cm
A5Margins.TOP # 3.5 cm (para cabeçalho)
A5Margins.BOTTOM # 1.8 cm

A5Margins.usable_width() # Calcula largura utilizável automaticamente

Espaçamentos:
A5Margins.SECTION_SPACING # 0.08 cm (entre seções)
A5Margins.ROW_SPACING # 0.06 cm (entre linhas)
A5Margins.PARAGRAPH_SPACING # 0.05 cm (entre parágrafos)

========================================================
PROCESSAMENTO DE LOGO:
========================================================

A nova função \_safe_image_reader_transparent() detecta e remove
fundos brancos das logos automaticamente, mantendo transparência.

Você não precisa fazer nada especial — apenas passe o caminho!

header_config = build_personalized_header(
doc_type=DocumentType.LABORATORY_RESULT,
tenant_name=tenant_name,
logo_path=os.path.join(settings.BASE_DIR, "static", "img", "logo.png"),
)

Se a logo tiver fundo branco, será automaticamente transparente no PDF!

========================================================
EXEMPLO COMPLETO (result_pdf_generator.py migrado):
========================================================

from **future** import annotations

import io
import os

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.platypus import (
HRFlowable,
Paragraph,
SimpleDocTemplate,
Spacer,
Table,
TableStyle,
)

from domain.clinical.result_state import ResultState

from .pdf_improvements import (
A5Margins,
DocumentType,
bold_text,
build_personalized_header,
cell_style_improved,
draw_header_improved,
section_style_improved,
title_style_improved,
FONT_IMPROVED_BOLD,
)
from .pdf_base import (
NumberedCanvas,
append_fim,
cell_paragraph,
draw_line_full_width,
institutional_user_identity,
montar_bloco_identificacao,
pdf_encryption,
)

def \_format_results_date(request):
date = getattr(request, "created_at", None)
if not date:
return "—"
return date.strftime("%d/%m/%Y %H:%M")

def \_resolve_document_user(request, resultados_qs):
if resultados_qs:
for r in resultados_qs:
if r.validated_by:
return r.validated_by
return getattr(request, "analyst", None)

def generate_results_pdf(request, apenas_validados=True) -> tuple[bytes, str]:
\"\"\"Gera PDF de resultados laboratoriais com cabeçalho personalizado.\"\"\"

    buffer = io.BytesIO()
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

    # Tenant info
    patient = request.patient
    tenant = getattr(patient, "tenant", None)
    tenant_name = getattr(tenant, "name", "CLÍNICA DE DIAGNÓSTICOS E SAÚDE")

    # Header personalizado
    header_config = build_personalized_header(
        doc_type=DocumentType.LABORATORY_RESULT,
        tenant_name=tenant_name,
        logo_path=os.path.join(settings.BASE_DIR, "static", "img", "logo.png"),
    )

    # Barcode
    try:
        result_obj = getattr(request, "result", None)
        cod_result = getattr(result_obj, "custom_id", None) or getattr(request, "custom_id", "")
        doc.barcode_value = f"PAC:{getattr(patient, 'custom_id', '')}|RES:{cod_result}"
    except Exception:
        doc.barcode_value = None

    # Results
    result = getattr(request, "result", None)
    resultados_qs = result.items.select_related("exam_field", "exam_field__exam") if result else []

    if apenas_validados and resultados_qs:
        resultados_qs = resultados_qs.filter(status=ResultState.VALIDATED)

    user_documento = _resolve_document_user(request, resultados_qs)

    # Patient ID
    left_lines = [
        f"{bold_text('Paciente')}: {patient.name}",
        f"{bold_text('Idade')}: {patient.idade()} - {bold_text('Gênero')}: {patient.gender or '—'}",
        f"{bold_text('Documento')}: {patient.document_type}: {patient.document_number or '—'}",
        f"{bold_text('Contacto')}: {patient.contact or '—'}",
    ]

    right_lines = [
        f"{bold_text('Email')}: {patient.email or '—'}",
        f"{bold_text('Requisição')}: {request.custom_id}",
        f"{bold_text('Data')}: {_format_results_date(request)}",
        f"{bold_text('Técnico')}: {institutional_user_identity(user_documento)}",
    ]

    # Elements
    elements = []

    elements.append(Paragraph("RESULTADOS DE ANÁLISES", title_style_improved()))
    elements.append(Spacer(1, A5Margins.SECTION_SPACING))

    patient_table = montar_bloco_identificacao(
        usable_width=usable_width,
        left_lines=left_lines,
        right_lines=right_lines,
    )
    elements.append(patient_table)
    elements.append(Spacer(1, A5Margins.SECTION_SPACING))

    elements.append(HRFlowable(
        width="100%",
        thickness=0.5,
        color=header_config["sector_color"]  # Usar cor do setor!
    ))
    elements.append(Spacer(1, A5Margins.SECTION_SPACING))

    elements.append(Paragraph("ANÁLISES PROCESSADAS", section_style_improved(
        color=header_config["sector_color"]
    )))
    elements.append(Spacer(1, A5Margins.ROW_SPACING))

    # Build tables
    exams_agrupados = {}
    for item in resultados_qs:
        exam = item.exam_field.exam
        exams_agrupados.setdefault(exam.name, []).append(item)

    if exams_agrupados:
        for exam_name, resultados in exams_agrupados.items():
            exam = resultados[0].exam_field.exam

            elements.append(Spacer(1, A5Margins.ROW_SPACING))
            elements.append(Paragraph(
                f"{exam_name} — {exam.method}",
                section_style_improved(color=header_config["sector_color"]),
            ))
            elements.append(Spacer(1, A5Margins.ROW_SPACING))

            date = [[
                cell_paragraph("Parâmetro", True),
                cell_paragraph("Resultado", True),
                cell_paragraph("Unidade", True),
                cell_paragraph("Ref.", True),
            ]]

            for r in resultados:
                campo = r.exam_field
                value = getattr(r, "formatted_result_value", None) or "—"
                reference_value = getattr(campo, "reference", None) or "—"

                date.append([
                    cell_paragraph(campo.name),
                    cell_paragraph(value),
                    cell_paragraph(campo.unit or "—"),
                    cell_paragraph(reference_value),
                ])

            table = Table(
                date,
                colWidths=[
                    usable_width * 0.40,
                    usable_width * 0.25,
                    usable_width * 0.15,
                    usable_width * 0.20,
                ],
            )

            table.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (-1, 0), FONT_IMPROVED_BOLD),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, header_config["sector_color"]),
            ]))

            elements.append(table)
            elements.append(Spacer(1, A5Margins.SECTION_SPACING))
    else:
        elements.append(cell_paragraph("Nenhum resultado disponível.", True))

    append_fim(elements)

    doc.build(
        elements,
        onFirstPage=lambda c, d: (
            draw_header_improved(c, d, header_config),
            draw_line_full_width(c, d),
        ),
        onLaterPages=lambda c, d: (
            draw_header_improved(c, d, header_config),
            draw_line_full_width(c, d),
        ),
        canvasmaker=NumberedCanvas,
    )

    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"{request.custom_id}_{patient.name}.pdf"
    return pdf_bytes, filename

gerar_pdf_resultados = generate_results_pdf
"""

# BENEFÍCIOS APÓS MIGRAÇÃO:

✓ Cabeçalho com nome real do tenant (não mais hardcoded)
✓ Cores e estilos específicos por tipo de documento
✓ Logo com fundo transparente automaticamente
✓ Margens otimizadas para espaço máximo em A5
✓ Fontes muito mais legíveis (Calibri/Segoe vs Helvetica)
✓ Espaçamento profissional e consistente
✓ Fácil customização por setor

========================================================
PRÓXIMAS MIGRAÇÕES:
========================================================

Aplique os mesmos passos a:

- procedure_pdf_generator.py (Procedimentos de Enfermagem)
- invoice_pdf_generator.py (Faturas)
- receipt_pdf_generator.py (Recibos)
- patient_history_pdf_generator.py (Histórico do Paciente)
- pharmacy_reports_pdf_generator.py (Relatórios de Farmácia)
- activity_reports_pdf_generator.py (Relatórios de Atividades)
- billing_invoice_user_history_pdf_generator.py (Faturamento)
- analytics_pdf_generator.py (Analítica)
- request_pdf_generator.py (Requisições)

Cada um receberá seu DocumentType apropriado e cores específicas!
"""

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Documenta o sistema de geração de PDFs e a sua integração administrativa por domínio.

**Valor que protege.** Protege documentos oficiais, rastreabilidade, consistência visual, tenant-awareness e execução fora do caminho crítico quando necessário.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve garantir atalhos de admin, geradores por modelo, nomes de ficheiro, permissões e exemplos reproduzíveis.

**Para production-ready.** Exige geração resiliente, logging, testes por tipo de documento, controlo de dados sensíveis e fallback operacional.
