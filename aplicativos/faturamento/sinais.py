from django.db.models.signals import post_save
from django.dispatch import receiver
from .modelos.fatura import Fatura

@receiver(post_save, sender=Fatura)
def registrar_evento_fatura(sender, instance, created, **kwargs):
    if created:
        try:
            linhas = [
                f"Origem: {instance.get_origem_display()}",
                f"Referência: {instance.referencia_origem or '-'}",
                f"Paciente: {getattr(instance.paciente, 'nome', '-')}",
                f"Estado: {instance.get_estado_display()}",
            ]
            instance.registrar_historico("CRIACAO", "Fatura criada", linhas=linhas)
        except Exception:
            # Histórico é auxiliar; não deve quebrar fluxo de criação.
            pass
