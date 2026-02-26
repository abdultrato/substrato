from django.db import models
from django.utils import timezone


class TimeStampMixin(models.Model):
    """
    Timestamp corporativo enterprise-ready.

    - Alta precisão
    - Indexado para auditoria
    - Compatível com SoftDelete
    - Seguro para ambientes multi-tenant
    """

    criado_em = models.DateTimeField(
        editable=False,
        db_index=True,
    )

    atualizado_em = models.DateTimeField(
        db_index=True,
    )

    class Meta:
        abstract = True
        ordering = ["-criado_em"]

    # ==========================================
    # CONTROLE MANUAL EM SAVE
    # ==========================================

    def save(self, *args, **kwargs):
        agora = timezone.now()

        if not self.pk:
            self.criado_em = agora

        self.atualizado_em = agora

        super().save(*args, **kwargs)

    # ==========================================
    # UPDATE OTIMIZADO (SEM ALTERAR criado_em)
    # ==========================================

    def touch(self, update_fields=None):
        """
        Atualiza somente atualizado_em.
        Útil para controle de sincronização.
        """
        self.atualizado_em = timezone.now()

        if update_fields:
            update_fields = set(update_fields)
            update_fields.add("atualizado_em")
        else:
            update_fields = ["atualizado_em"]

        self.save(update_fields=update_fields)
