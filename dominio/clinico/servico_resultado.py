# LOCAL: dominio/clinico/servico_resultado.py

from dominio.clinico.estado_resultado import EstadoResultado
from dominio.clinico.regras_paciente import InterpretadorResultado as InterpretadorReferencia
from dominio.clinico.valores_referencia import ResolverReferenciaClinica

CORES_STATUS = {"NORMAL" : "preto", "BAIXO" : "azul", "ALTO" : "vermelho", "CRITICO_BAIXO" : "vermelho", "CRITICO_ALTO" : "vermelho", }


class ServicoResultado :
	
	@staticmethod
	def interpretar(resultado_item) :
		campo = resultado_item.exame_campo
		
		indicador = None
		novo_cor = None
		novo_alerta = None
		
		# =====================================================
		# RESOLVER PACIENTE
		# =====================================================
		
		paciente = None
		
		if resultado_item.resultado and resultado_item.resultado.requisicao :
			paciente = resultado_item.resultado.requisicao.paciente
		
		# =====================================================
		# REFERÊNCIA CLÍNICA (sexo / idade)
		# =====================================================
		
		if paciente :
			referencia = ResolverReferenciaClinica.resolver(campo, paciente)
			
			if referencia :
				valor = (str(resultado_item.resultado_valor) if resultado_item.resultado_valor is not None else None)
				
				dados = InterpretadorReferencia.interpretar(valor, referencia)
				
				if dados :
					indicador = dados.get("status_clinico")
					novo_cor = dados.get("cor_laudo")
					novo_alerta = dados.get("alerta_critico")
		
		# =====================================================
		# FALLBACK PARA REFERÊNCIA DO CAMPO
		# =====================================================
		
		if indicador is None :
			indicador = campo.interpretar_resultado(resultado_item.resultado_valor)
		
		if indicador is None :
			return
		
		resultado_item.status_clinico = indicador
		
		# =====================================================
		# COR DO RESULTADO
		# =====================================================
		
		if novo_cor :
			resultado_item.cor_laudo = novo_cor
		else :
			resultado_item.cor_laudo = CORES_STATUS.get(indicador)
		
		# =====================================================
		# ALERTA CRÍTICO
		# =====================================================
		
		if novo_alerta is not None :
			resultado_item.alerta_critico = bool(novo_alerta)
		
		elif "CRITICO" in indicador :
			resultado_item.alerta_critico = True
		
		# =====================================================
		# DELTA CHECK
		# =====================================================
		
		ServicoResultado._delta_check(resultado_item)
		
		# =====================================================
		# AUTOVALIDAÇÃO
		# =====================================================
		
		ServicoResultado._auto_validar(resultado_item)
	
	# =====================================================
	# DELTA CHECK
	# =====================================================
	
	@staticmethod
	def _delta_check(resultado_item) :
		campo = resultado_item.exame_campo
		
		if not campo.delta_max :
			return
		
		paciente = None
		
		if resultado_item.resultado and resultado_item.resultado.requisicao :
			paciente = resultado_item.resultado.requisicao.paciente
		
		if not paciente :
			return
		
		anterior = (resultado_item.__class__.objects.filter(resultado__requisicao__paciente = paciente, exame_campo = campo, ).exclude(pk = resultado_item.pk).order_by("-criado_em").first())
		
		if not anterior :
			return
		
		try :
			atual = float(resultado_item.resultado_valor)
			antigo = float(anterior.resultado_valor)
		except Exception :
			return
		
		delta = abs(atual - antigo)
		
		if delta > campo.delta_max :
			resultado_item.alerta_critico = True
	
	# =====================================================
	# AUTOVALIDAÇÃO
	# =====================================================
	
	@staticmethod
	def _auto_validar(resultado_item) :
		"""
		Auto-validação foi desativada.

		Motivo: o fluxo do laboratório exige a sequência
		"lançar -> gravar -> validar" (com auditoria em `validado_por` e `data_validacao`).
		A validação deve acontecer via `ResultadoItem.transicionar(VALIDADO, usuario=...)`.
		"""
		return
