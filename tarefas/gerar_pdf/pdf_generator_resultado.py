import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import cm
from reportlab.platypus import (HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, )

from dominio.clinico.estado_resultado import EstadoResultado
from .pdf_base import (append_fim, bold, cell_paragraph, draw_line_full_width, estilo_secao_documento, estilo_titulo_documento, FONT_BOLD, identidade_usuario_institucional, montar_bloco_identificacao, NumberedCanvas, on_page)


def _formatar_data_resultados(requisicao) :
	data = getattr(requisicao, "criado_em", None)
	if not data :
		return "—"
	return data.strftime("%d/%m/%Y %H:%M")


def _resolver_usuario_documento(requisicao, resultados_qs) :
	if resultados_qs :
		for r in resultados_qs :
			if r.validado_por :
				return r.validado_por
	
	return getattr(requisicao, "analista", None)


def gerar_pdf_resultados(requisicao, apenas_validados = True) -> tuple[bytes, str] :
	buffer = io.BytesIO()
	
	page_width, _ = A5
	margin = 1 * cm
	usable_width = page_width - (margin * 2)
	
	doc = SimpleDocTemplate(buffer, pagesize = A5, leftMargin = margin, rightMargin = margin, topMargin = 3.8 * cm, bottomMargin = 2.0 * cm, )
	
	elements = []
	
	paciente = requisicao.paciente
	
	# =====================================
	# RESULTADOS
	# =====================================
	
	resultado = getattr(requisicao, "resultado", None)
	
	if resultado :
		resultados_qs = resultado.itens.select_related("exame_campo", "exame_campo__exame", )
	else :
		resultados_qs = []
	
	if apenas_validados and resultados_qs :
		resultados_qs = resultados_qs.filter(estado = EstadoResultado.VALIDADO)
	
	usuario_documento = _resolver_usuario_documento(requisicao, resultados_qs, )
	
	# =====================================
	# IDENTIFICAÇÃO DO PACIENTE
	# =====================================
	
	left_lines = [f"{bold('Paciente')}: {paciente.nome}", f"{bold('Idade')}: {paciente.idade()} - {bold('Gênero')}: {paciente.genero or '—'} - {bold('Raça')}: {paciente.raca_origem}", f"{bold('Documento')}: {paciente.tipo_documento}: {paciente.numero_id or 'Não forneceu documento'}", f"{bold('Proveniência')}: {paciente.proveniencia or '—'}", f"{bold('Contacto')}: {paciente.contacto or '—'}", ]
	
	tecnico_texto = identidade_usuario_institucional(usuario_documento)
	
	right_lines = [f"{bold('E-mail')}: {paciente.email or '—'}", f"{bold('Requisição')}: {requisicao.id_custom}", f"{bold('Data dos Resultados')}: {_formatar_data_resultados(requisicao)}", f"{bold('Técn. de Laboratório')}: {tecnico_texto}", ]
	
	# =====================================
	# TÍTULO
	# =====================================
	
	style_title = estilo_titulo_documento("HeadingRes")
	style_section = estilo_secao_documento("SectionRes")
	
	elements.append(Paragraph("RESULTADOS DE ANÁLISES", style_title))
	elements.append(Spacer(1, 0.3 * cm))
	
	patient_table = montar_bloco_identificacao(usable_width = usable_width, left_lines = left_lines, right_lines = right_lines, )
	
	elements.append(patient_table)
	elements.append(Spacer(1, 0.3 * cm))
	
	elements.append(HRFlowable(width = "100%", thickness = 0.5, color = colors.darkblue))
	elements.append(Spacer(1, 0.3 * cm))
	
	elements.append(Paragraph("ANÁLISES PROCESSADAS", style_section))
	elements.append(Spacer(1, 0.2 * cm))
	
	# =====================================
	# AGRUPAMENTO POR EXAME
	# =====================================
	
	exames_agrupados = {}
	
	for item in resultados_qs :
		exame = item.exame_campo.exame
		exames_agrupados.setdefault(exame.nome, []).append(item)
	
	# =====================================
	# TABELAS
	# =====================================
	
	if exames_agrupados :
		for exame_nome, resultados in exames_agrupados.items() :
			exame = resultados[0].exame_campo.exame
			
			elements.append(Spacer(1, 0.2 * cm))
			elements.append(Paragraph(f"{exame_nome} — {exame.metodo}", style_section, ))
			
			elements.append(Spacer(1, 0.2 * cm))
			
			data = [[cell_paragraph("Parâmetro", True), cell_paragraph("Resultado", True), cell_paragraph("Unidade", True), cell_paragraph("Valor de Referência", True), ]]
			
			for r in resultados :
				campo = r.exame_campo
				
				valor = r.resultado_valor_formatado or "-"
				
				data.append([cell_paragraph(campo.nome), cell_paragraph(valor), cell_paragraph(campo.unidade or "-"), cell_paragraph(campo.referencia or "-"), ])
			
			table = Table(data, colWidths = [usable_width * 0.40, usable_width * 0.25, usable_width * 0.15, usable_width * 0.20, ], )
			
			table.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, 0), FONT_BOLD), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2), ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.darkblue), ]))
			
			elements.append(table)
			elements.append(Spacer(1, 0.3 * cm))
	
	else :
		elements.append(cell_paragraph("Nenhum resultado disponível para esta requisição.", True, ))
	
	append_fim(elements)
	
	# =====================================
	# BUILD
	# =====================================
	
	doc.build(elements, onFirstPage = lambda c, d : (on_page(c, d, usuario_documento), draw_line_full_width(c, d),), onLaterPages = lambda c, d : (on_page(c, d, usuario_documento), draw_line_full_width(c, d),), canvasmaker = NumberedCanvas, )
	
	pdf_bytes = buffer.getvalue()
	buffer.close()
	
	filename = f"{requisicao.id_custom}_{requisicao.paciente.nome}.pdf"
	
	return pdf_bytes, filename