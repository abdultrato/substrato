from django.db.models.signals import post_save
from django.dispatch import receiver
from .modelos import Usuario, PerfilProfissional

@receiver(post_save, sender=Usuario)
def criar_perfil(sender, instance, created, **kwargs):
    if created:
        PerfilProfissional.objects.create(usuario=instance)

