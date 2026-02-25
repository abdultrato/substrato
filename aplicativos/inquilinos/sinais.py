from django.db.models.signals import post_save
from django.dispatch import receiver
from .modelos import Inquilino, ConfiguracaoInquilino

@receiver(post_save, sender=Inquilino)
def criar_configuracao(sender, instance, created, **kwargs):
    if created:
        ConfiguracaoInquilino.objects.create(inquilino=instance)
