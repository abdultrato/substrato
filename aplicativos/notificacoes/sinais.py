from django.db.models.signals import post_save
from django.dispatch import receiver
from aplicativos.clinico.modelos.resultado import Resultado
from .servicos import ServicoNotificacao

@receiver(post_save, sender=Resultado)
def notificar_resultado(sender, instance, created, **kwargs):
    if created and instance.validado:
        paciente = instance.amostra.requisicao.paciente
        if paciente.email:
            ServicoNotificacao().enviar(
                paciente.email,
                "Seu resultado está disponível.",
                "email"
            )
