# LOCAL: dominio/clinico/servico_resultado.py

from decimal import Decimal, InvalidOperation

from dominio.clinico.interpretador import interpretar, StatusClinico
from dominio.clinico.valores_referencia import ResolverReferenciaClinica


class ServicoResultado :
	
	@staticmethod
	def interpretar(resultado_item) :
		if not resultado_item.resultado :
			return
		
		paciente = resultado_item.requisicao.paciente
		exame_campo = resultado_item.exame_campo
		
		referencia = ResolverReferenciaClinica.resolver(exame_campo, paciente, )
		
		try :
			valor = Decimal(resultado_item.resultado)
		except (InvalidOperation, TypeError) :
			resultado_item.status_clinico = "invalido"
			resultado_item.cor_laudo = "cinza"
			resultado_item.alerta_critico = False
			return
		
		status = interpretar(valor, referencia)
		
		resultado_item.status_clinico = status
		
		if status == StatusClinico.CRITICO :
			resultado_item.cor_laudo = "vermelho"
			resultado_item.alerta_critico = True
		
		elif status in (StatusClinico.ALTO, StatusClinico.BAIXO) :
			resultado_item.cor_laudo = "amarelo"
			resultado_item.alerta_critico = False
		
		else :
			resultado_item.cor_laudo = "verde"
			resultado_item.alerta_critico = False