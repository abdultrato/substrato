from django.db.models import Q

from aplicativos.clinico.modelos.referencia_clinica import ReferenciaClinica


class ResolverReferenciaClinica :
	
	@staticmethod
	def resolver(exame_campo, paciente) :
		referencias = ReferenciaClinica.objects.filter(exame_campo = exame_campo)
		
		if paciente.genero :
			referencias = referencias.filter(Q(sexo = paciente.genero) | Q(sexo__isnull = True))
		
		referencia = referencias.first()
		
		return referencia