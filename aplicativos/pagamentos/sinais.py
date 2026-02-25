from django.db.models.signals import post_save
from django.dispatch import receiver
from .modelos.pagamento import Pagamento
from .modelos.recibo import Recibo
import uuid

@receiver(post_save, sender=Pagamento)
def gerar_recibo(sender, instance, created, **kwargs):
    if created and instance.confirmado:
        Recibo.objects.create(
            pagamento=instance,
            codigo=str(uuid.uuid4())
        )
