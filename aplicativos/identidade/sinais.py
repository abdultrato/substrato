from django.db.models.signals import post_save
from django.dispatch import receiver

from .modelos.usuario import Usuario
from .modelos.perfil import PerfilProfissional


@receiver(post_save, sender=Usuario)
def criar_perfil(sender, instance, created, **kwargs):
    if created:
        PerfilProfissional.objects.get_or_create(usuario=instance)
