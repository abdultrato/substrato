from django.db.models.signals import post_save
from django.dispatch import receiver

from frontend.billing.models.requisicao_analise import RequisicaoAnalise


@receiver(post_save, sender=RequisicaoAnalise)
def criar_resultados(sender, instance, created, **kwargs):
    if created:
        instance.criar_resultados_automaticos()
        instance.criar_itens_automaticos()
