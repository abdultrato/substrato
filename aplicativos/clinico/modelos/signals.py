from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver

from .fatura import Fatura
from .requisicao_analise import RequisicaoAnalise


# =========================================================
# CRIA FATURA AUTOMATICAMENTE
# =========================================================
@receiver(post_save, sender=RequisicaoAnalise)
def criar_fatura_automatica(sender, instance, created, **kwargs):
    if created:
        Fatura.objects.create(
            requisicao=instance,
            paciente=instance.paciente,
        )


# =========================================================
# ATUALIZA ITENS E RESULTADOS AO ALTERAR EXAMES
# =========================================================
@receiver(m2m_changed, sender=RequisicaoAnalise.exames.through)
def atualizar_snapshot_requisicao(sender, instance, action, **kwargs):
    if action in ["post_add", "post_remove", "post_clear"]:
        instance.criar_itens_automaticos()
        instance.criar_resultados_automaticos()
