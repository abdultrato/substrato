from django.db.models.signals import post_save
from django.dispatch import receiver

from .models.invoice import Invoice


@receiver(post_save, sender=Invoice)
def register_invoice_event(sender, instance, created, **kwargs):
    if created:
        try:
            linhas = [
                f"Origem: {instance.get_origem_display()}",
                f"Referência: {instance.source_reference or '-'}",
                f"Paciente: {getattr(instance.paciente, 'nome', '-')}",
                f"Estado: {instance.get_estado_display()}",
            ]
            instance.register_history("CRIACAO", "Fatura criada", linhas=linhas)
        except Exception:
            # Histórico é auxiliar; não deve quebrar fluxo de criação.
            pass
