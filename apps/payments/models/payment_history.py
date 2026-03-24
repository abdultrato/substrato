from django.db import models

from infrastructure.orm.fields.dinheiro_field import DinheiroField
from core.models.base import CoreModel


class PaymentHistory(CoreModel):
    """
    Registro imutável de eventos do Pagamento.

    Serve como trilha auditável.
    """

    class EventType(models.TextChoices):
        CRIADO = "CRIADO", "Criado"
        CONFIRMADO = "CONFIRMADO", "Confirmado"
        FALHA = "FALHA", "Falha"
        ESTORNADO = "ESTORNADO", "Estornado"
        CANCELADO = "CANCELADO", "Cancelado"

    TipoEvento = EventType

    pagamento = models.ForeignKey(
        "pagamentos.Payment",
        on_delete=models.CASCADE,
        related_name="historico",
        verbose_name="Pagamento",
    )

    tipo_evento = models.CharField(
        verbose_name="Tipo de evento",
        max_length=15,
        choices=EventType.choices,
        db_index=True,
    )

    valor = DinheiroField(
        verbose_name="Valor",
        null=True,
        blank=True,
    )

    descricao = models.CharField(
        verbose_name="Descrição",
        max_length=255,
        blank=True,
    )

    referencia_externa = models.CharField(
        verbose_name="Referência externa",
        max_length=120,
        blank=True,
    )

    class Meta:
        verbose_name = "Histórico de Pagamento"
        verbose_name_plural = "Histórico de Pagamentos"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["pagamento"]),
            models.Index(fields=["tipo_evento"]),
            models.Index(fields=["criado_em"]),
        ]

    def __str__(self):
        return f"{self.tipo_evento} - {self.pagamento_id}"

    def save(self, *args, **kwargs):
        """
        Impede alteração após criação.
        """
        if self.pk:
            raise ValueError("Registros do histórico não podem ser alterados.")
        super().save(*args, **kwargs)
