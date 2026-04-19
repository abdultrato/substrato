"""Modelo de venda da farmácia."""

from decimal import Decimal  # Valores monetários

from django.core.validators import MinValueValidator  # Validador numérico mínimo
from django.db import models  # ORM
from django.utils import timezone  # Datas/horários

from core.models.base import NoNameCoreModel  # Modelo base sem campo name


class Sale(NoNameCoreModel):
    """Venda composta por itens e total."""

    prefix = "VEND"  # Prefixo para IDs amigáveis

    number = models.CharField(
        db_column="number",  # Coluna
        verbose_name="Número",  # Rótulo
        max_length=40,  # Tamanho máximo
        db_index=True,  # Índice para busca rápida
    )

    patient = models.ForeignKey(
        "clinical.Patient",  # Cliente/paciente ligado à venda
        db_column="patient_id",  # Coluna
        verbose_name="Paciente",  # Rótulo
        on_delete=models.PROTECT,  # Não permite apagar paciente com vendas
        related_name="vendas_farmacia",  # Nome reverso
        null=True,  # Opcional
        blank=True,  # Permite campo vazio em formulário
        db_index=True,  # Índice
    )

    total = models.DecimalField(
        verbose_name="Total",  # Rótulo
        max_digits=14,  # Dígitos totais
        decimal_places=2,  # Casas decimais
        default=Decimal("0.00"),  # Valor inicial
        validators=[MinValueValidator(Decimal("0.00"))],  # Não permite negativo
    )

    class Meta:
        db_table = "farmacia_venda"  # Nome da tabela
        verbose_name = "Venda"  # Nome legível
        verbose_name_plural = "Vendas"  # Nome plural
        ordering = ["-created_at"]  # Ordena da mais recente
        indexes = [
            models.Index(fields=["tenant", "number"]),
            models.Index(fields=["tenant", "patient"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "number"],  # Número único por tenant
                condition=models.Q(deleted=False),  # Desconsidera excluídos logicamente
                name="unique_number_sale_por_tenant",
            )
        ]

    def save(self, *args, **kwargs):
        """Gera número sequencial simples quando não informado."""

        if not self.number:
            self.number = timezone.now().strftime("V%Y%m%d%H%M%S")  # Sufixo com data/hora
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Representação legível para admin e logs."""
        return self.number or self.custom_id or f"Venda {self.pk}"
