from django.db.models.signals import post_save
from django.dispatch import receiver

from aplicativos.pagamentos.modelos import Pagamento
from aplicacao.contabilidade.registrar_lancamento import registrar_lancamento
from aplicativos.contabilidade.modelos import Conta


@receiver(post_save, sender=Pagamento)
def registrar_pagamento_contabil(sender, instance, created, **kwargs):

    if not instance.confirmado:
        return

    if instance.lancamento_contabil_id:
        return

    caixa = Conta.objects.get(codigo="CAIXA")
    receita = Conta.objects.get(codigo="RECEITA")

    lancamento = registrar_lancamento(
        f"Recebimento pagamento {instance.id}",
        [
            {"conta": caixa, "debito": instance.valor},
            {"conta": receita, "credito": instance.valor},
        ],
    )

    instance.lancamento_contabil = lancamento
    instance.save(update_fields=["lancamento_contabil"])
