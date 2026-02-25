from django.db.models.signals import post_save
from django.dispatch import receiver
from aplicativos.pagamentos.modelos.pagamento import Pagamento
from .servicos import ServicoContabil
from .modelos.conta import Conta

@receiver(post_save, sender=Pagamento)
def registrar_pagamento_contabil(sender, instance, created, **kwargs):
    if instance.confirmado:
        caixa = Conta.objects.get(codigo="CAIXA")
        receita = Conta.objects.get(codigo="RECEITA")

        ServicoContabil().registrar_lancamento(
            "Recebimento de pagamento",
            [
                {"conta": caixa, "debito": instance.valor},
                {"conta": receita, "credito": instance.valor},
            ],
        )
