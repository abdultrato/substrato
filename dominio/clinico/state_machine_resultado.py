# LOCAL: dominio/clinico/state_machine_resultado.py

from dominio.clinico.estado_resultado import EstadoResultado


class TransicaoInvalidaError(Exception) :
	pass


class ResultadoStateMachine :
	TRANSICOES = {EstadoResultado.PENDENTE : {EstadoResultado.EM_ANALISE, }, EstadoResultado.EM_ANALISE : {EstadoResultado.AGUARDANDO_VALIDACAO, }, EstadoResultado.AGUARDANDO_VALIDACAO : {EstadoResultado.VALIDADO, EstadoResultado.REJEITADO, }, EstadoResultado.REJEITADO : {EstadoResultado.EM_ANALISE, }, }
	
	@classmethod
	def validar_transicao(cls, estado_atual, novo_estado) :
		if estado_atual in EstadoResultado.TERMINAIS :
			raise TransicaoInvalidaError("Estado final não permite transições.")
		
		permitidos = cls.TRANSICOES.get(estado_atual, set())
		
		if novo_estado not in permitidos :
			raise TransicaoInvalidaError(f"Transição inválida de {estado_atual} para {novo_estado}.")