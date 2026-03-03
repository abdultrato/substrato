from dominio.clinico.interpretador import interpretar
from dominio.clinico.valores_referencia import ResolverReferenciaClinica


class ServicoResultado :
	"""
	Orquestra interpretação clínica.
	"""
	
	@staticmethod
	def interpretar(resultado_item) :
		paciente = resultado_item.requisicao.paciente
		exame_campo = resultado_item.exame_campo
		
		referencia = ResolverReferenciaClinica.resolver(exame_campo, paciente, )
		
		dados = interpretar(resultado_item.resultado, referencia, )
		
		if not dados :
			return
		
		for campo, valor in dados.items() :
			setattr(resultado_item, campo, valor)
		
		resultado_item.save(update_fields = ["status_clinico", "cor_laudo", "alerta_critico", ])