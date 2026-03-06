# LOCAL: dominio/clinico/servico_resultado.py

from dominio.clinico.estado_resultado import EstadoResultado


class ServicoResultado :
	
	@staticmethod
	def interpretar(resultado_item) :
		campo = resultado_item.exame_campo
		
		indicador = campo.interpretar_resultado(resultado_item.resultado_valor)
		
		if not indicador :
			return
		
		resultado_item.status_clinico = indicador
		
		cores = {"NORMAL" : "preto", "BAIXO" : "azul", "ALTO" : "vermelho", "CRITICO_BAIXO" : "vermelho", "CRITICO_ALTO" : "vermelho", }
		
		resultado_item.cor_laudo = cores.get(indicador)
		
		if "CRITICO" in indicador :
			resultado_item.alerta_critico = True
		
		ServicoResultado._delta_check(resultado_item)
		
		ServicoResultado._auto_validar(resultado_item)
	
	# =====================================================
	# DELTA CHECK
	# =====================================================
	
	@staticmethod
	def _delta_check(resultado_item) :
		campo = resultado_item.exame_campo
		
		if not campo.delta_max :
			return
		
		anterior = (
			resultado_item.__class__.objects.filter(resultado__paciente = resultado_item.resultado.paciente, exame_campo = campo, ).exclude(pk = resultado_item.pk).order_by("-criado_em").first())
		
		if not anterior :
			return
		
		try :
			atual = float(resultado_item.resultado_valor)
			antigo = float(anterior.resultado_valor)
		except :
			return
		
		delta = abs(atual - antigo)
		
		if delta > campo.delta_max :
			resultado_item.alerta_critico = True
	
	# =====================================================
	# AUTOVALIDAÇÃO
	# =====================================================
	
	@staticmethod
	def _auto_validar(resultado_item) :
		if resultado_item.alerta_critico :
			return
		
		if resultado_item.status_clinico != "NORMAL" :
			return
		
		resultado_item.estado = EstadoResultado.VALIDADO