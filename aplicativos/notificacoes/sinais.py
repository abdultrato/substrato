from django.db.models.signals import post_save
from django.dispatch import receiver

from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from .servicos import ServicoNotificacao


@receiver(post_save, sender = ResultadoItem)
def notificar_resultado(sender, instance, created, **kwargs) :
	if not created :
		return
	
	if not instance.validado :
		return
	
	paciente = instance.requisicao.paciente  # objeto
	
	if paciente and paciente.email :
		ServicoNotificacao().enviar(paciente.email, "Seu resultado está disponível.", "email", )