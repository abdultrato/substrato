from django.db import models

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class PaymentHistory(CoreModel):
    """Registro imutável de eventos do pagamento (trilha auditável)."""

    class EventType(models.TextChoices):
        CRIADO = "CRIADO", "Criado"
        CONFIRMADO = "CONFIRMADO", "Confirmado"
        FALHA = "FALHA", "Falha"
        ESTORNADO = "ESTORNADO", "Estornado"
        CANCELADO = "CANCELADO", "Cancelado"

    TipoEvento = EventType

    payment = models.ForeignKey(

        "pagamentos.Payment",

        db_column="payment_id",
        on_delete=models.CASCADE,
        related_name="historico",
        verbose_name="Pagamento",
    )

    event_type = models.CharField(

        db_column="event_type",

        verbose_name="Tipo de evento",
        max_length=15,
        choices=EventType.choices,
        db_index=True,
    )

    value = MoneyField(

        db_column="value",

        verbose_name="Valor",
        null=True,
        blank=True,
    )

    description = models.CharField(

        db_column="description",

        verbose_name="Descrição",
        max_length=255,
        blank=True,
    )

    external_reference = models.CharField(

        db_column="external_reference",

        verbose_name="Referência externa",
        max_length=120,
        blank=True,
    )

    class Meta:
        db_table = "pagamentos_historicopagamento"
        verbose_name = "Histórico de Pagamento"
        verbose_name_plural = "Histórico de Pagamentos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payment"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.payment_id}"

    def save(self, *args, **kwargs):
        """
        Impede alteração após criação.
        """
        if self.pk:
            raise ValueError("Registros do histórico não podem ser alterados.")
        super().save(*args, **kwargs)

