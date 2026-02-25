from django.db.models.signals import post_save
from django.dispatch import receiver
from .modelos.resultado import Resultado
from .modelos.historico_clinico import HistoricoClinico

@receiver(post_save, sender=Resultado)
def registrar_historico(sender, instance, created, **kwargs):
    if created:
        HistoricoClinico.objects.create(
            paciente=instance.amostra.requisicao.paciente,
            descricao=f"Resultado registrado: {instance.exame}"
        )
