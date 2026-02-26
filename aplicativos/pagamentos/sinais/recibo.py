from django.db.models.signals import post_save
from django.dispatch import receiver

from aplicativos.pagamentos.modelos.pagamento import Pagamento
from aplicacao.pagamentos.confirmar_pagamento import confirmar_pagamento


@receiver(post_save, sender=Pagamento)
def gerar_recibo(sender, instance, created, **kwargs):
    if instance.confirmado:
        confirmar_pagamento(instance)
