from django.db.models.signals import post_save
from django.dispatch import receiver

from .models.item_venda import ItemVenda
from aplicacao.farmacia.registrar_saida import registrar_saida


@receiver(post_save, sender=ItemVenda)
def baixar_estoque_apos_venda(sender, instance, created, **kwargs):
    if created:
        lote = instance.produto.lotes.first()
        registrar_saida(lote, instance.quantidade)
