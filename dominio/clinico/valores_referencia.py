# LOCAL: dominio/clinico/valores_referencia.py

from datetime import date

from dominio.clinico.interpretador import IntervaloReferencia


class ResolverReferenciaClinica :
	
	@staticmethod
	def resolver(exame_campo, paciente) :
		from aplicativos.clinico.modelos.referencia_clinica import ReferenciaClinica
		
		if not paciente :
			return IntervaloReferencia()
		
		idade_dias = None
		
		if paciente.data_nascimento :
			idade_dias = (date.today() - paciente.data_nascimento).days
		
		referencias = ReferenciaClinica.objects.filter(exame_campo = exame_campo, deletado = False, )
		
		if paciente.genero :
			referencias = referencias.filter(sexo__in = [paciente.genero, None])
		
		if idade_dias is not None :
			referencias = referencias.filter(idade_minima_dias__lte = idade_dias, idade_maxima_dias__gte = idade_dias, )
		
		referencia = referencias.order_by("ordem").first()
		
		if not referencia :
			return IntervaloReferencia()
		
		return IntervaloReferencia(minimo = referencia.valor_minimo, maximo = referencia.valor_maximo, critico_baixo = referencia.critico_baixo, critico_alto = referencia.critico_alto, )