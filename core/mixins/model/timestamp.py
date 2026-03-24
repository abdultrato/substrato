from django.db import models
from django.utils import timezone


class TimestampMixin(models.Model):
    """
    Timestamp mixin (`criado_em`, `atualizado_em`).
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

    def save(self, *args, **kwargs):
        now_value = timezone.now()

        if not self.pk:
            self.criado_em = now_value

        self.atualizado_em = now_value

        super().save(*args, **kwargs)

    def touch(self, update_fields=None):
        """
        Updates `atualizado_em` without touching `criado_em`.
        """
        self.atualizado_em = timezone.now()

        if update_fields:
            update_fields = set(update_fields)
            update_fields.add("atualizado_em")
        else:
            update_fields = ["atualizado_em"]

        self.save(update_fields=update_fields)


TimeStampMixin = TimestampMixin
