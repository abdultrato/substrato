from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Sale(NoNameCoreModel):
    prefix = "VEND"

    number = models.CharField(

        db_column="numero",

        verbose_name="Número", max_length=40, db_index=True)

    patient = models.ForeignKey(

        "clinico.Patient",

        db_column="paciente_id",
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
        db_table = "farmacia_venda"
        verbose_name = "Venda"
        verbose_name_plural = "Vendas"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "number"]),
            models.Index(fields=["tenant", "patient"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "number"],
                condition=models.Q(deleted=False),
                name="unique_number_sale_por_tenant",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = timezone.now().strftime("V%Y%m%d%H%M%S")
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.number or self.custom_id or f"Venda {self.pk}"
