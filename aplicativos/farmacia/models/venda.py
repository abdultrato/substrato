from decimal import Decimal

from django.db import models
from django.db.models import Q

from nucleo.modelos.base import NoNameCoreModel


class Venda(NoNameCoreModel):

    prefixo = "VEND"

    numero = models.CharField(
        max_length=50,
        db_index=True,
        editable=False,
        blank=True,
    )

    total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:

        verbose_name = "Venda"
        verbose_name_plural = "Vendas"

        ordering = ["-criado_em"]

        indexes = [
            models.Index(fields=["criado_em"]),
            models.Index(fields=["deletado"]),
            models.Index(fields=["numero"]),
            models.Index(fields=["inquilino", "criado_em"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "numero"],
                condition=Q(deletado=False),
                name="unique_numero_venda_por_inquilino",
            )
        ]

    def save(self, *args, **kwargs):

        creating = self.pk is None

        # salva primeiro para gerar id_custom
        super().save(*args, **kwargs)

        if creating and not self.numero:
            self.numero = self.id_custom
            super().save(update_fields=["numero"])

    def __str__(self):
        return self.numero or self.id_custom
