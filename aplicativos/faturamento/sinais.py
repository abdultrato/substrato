from django.db.models.signals import post_save
from django.dispatch import receiver
from .modelos.fatura import Fatura
from .modelos.historico_fatura import HistoricoFatura

@receiver(post_save, sender=Fatura)
def registrar_evento_fatura(sender, instance, created, **kwargs):
    if created:
        HistoricoFatura.objects.create(
            inquilino=instance.inquilino,
            nome="Fatura criada",
            fatura=instance,
            descricao="Fatura criada",
            tipo_evento="CRIACAO",
        )
