from django.db.models.signals import post_save
from django.dispatch import receiver

from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from aplicacao.notificacoes.enviar_notificacao import enviar_notificacao


@receiver(post_save, sender=ResultadoItem)
def notificar_resultado_validado(sender, instance, created, **kwargs):

    if not created:
        return

    if not instance.validado:
        return

    paciente = instance.amostra.requisicao.paciente

    if paciente.email:
        enviar_notificacao(
            destino=paciente.email,
            mensagem="Seu resultado está disponível.",
            canal="email",
        )
