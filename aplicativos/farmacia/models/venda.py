from decimal import Decimal
from django.db import models
from django.db.models import Q

from nucleo.modelos.base import CoreModel


class Venda(CoreModel):
    """
    Entidade financeira de venda.

    Enterprise-ready:
    - Multi-tenant
    - Auditável
    - Indexado para relatórios
    - Escalável
    """
    
    prefixo = "VEND"

    numero = models.CharField(
        max_length=50,
        db_index=True,
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
            # Relatórios por período
            models.Index(fields=["criado_em"]),

            # Filtro principal do sistema
            models.Index(fields=["ativo", "deletado"]),

            # Busca por número
            models.Index(fields=["numero"]),

            # Se multi-tenant:
            models.Index(fields=["inquilino", "criado_em"]),
        ]

        constraints = [
            # Unicidade por inquilino (recomendado SaaS)
            models.UniqueConstraint(
                fields=["inquilino", "numero"],
                condition=Q(deletado=False),
                name="unique_numero_venda_por_inquilino",
            )
        ]

    def __str__(self):
        return self.numero
