from django.db.models.signals import post_save
from django.dispatch import receiver

from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from servicos.clinico.servico_resultado import ServicoResultado


@receiver(post_save, sender = ResultadoItem)
def interpretar_resultado(sender, instance, created, **kwargs) :
	if instance.resultado and not instance.validado :
		ServicoResultado.interpretar(instance)