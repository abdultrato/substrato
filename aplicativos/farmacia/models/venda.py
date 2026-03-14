from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel


class Venda(NoNameCoreModel):
    prefixo = "VEND"

    numero = models.CharField(verbose_name="Número", max_length=40, db_index=True)

    paciente = models.ForeignKey(
        "clinico.Paciente",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="vendas_farmacia",
        null=True,
        blank=True,
        db_index=True,
    )

    total = models.DecimalField(
        verbose_name="Total",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        verbose_name = "Venda"
        verbose_name_plural = "Vendas"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "numero"]),
            models.Index(fields=["inquilino", "paciente"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "numero"],
                condition=models.Q(deletado=False),
                name="unique_numero_venda_por_inquilino",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = timezone.now().strftime("V%Y%m%d%H%M%S")
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.numero or self.id_custom or f"Venda {self.pk}"
