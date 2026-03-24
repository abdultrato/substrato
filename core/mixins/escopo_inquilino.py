# LOCAL: nucleo/mixins/escopo_inquilino.py

from django.db import models

from infrastructure.context.tenant import get_inquilino


class InquilinoMixin(models.Model):
    inquilino = models.ForeignKey(
        "inquilinos.Tenant",
        on_delete=models.PROTECT,
        related_name="%(class)ss",
        db_index=True,
    )

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["inquilino"]),
        ]

    def save(self, *args, **kwargs):
        if not self.inquilino_id:
            inquilino = get_inquilino()
            if inquilino:
                self.inquilino = inquilino

        super().save(*args, **kwargs)
