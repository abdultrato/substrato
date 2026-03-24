from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from core.mixins.audit import AuditoriaMixin
from core.mixins.identifier import IdentificadorMixin
from core.mixins.model.description import DescricaoMixin
from core.mixins.model.name import NomeMixin
from core.mixins.model.order import OrdemMixin
from core.mixins.soft_delete import SoftDeleteMixin
from core.mixins.versioning import VersionamentoMixin
from core.models.base import BaseModel


class SubscriptionPlan(
    NomeMixin,
    DescricaoMixin,
    OrdemMixin,
    IdentificadorMixin,
    AuditoriaMixin,
    VersionamentoMixin,
    SoftDeleteMixin,
    BaseModel,
):
    prefixo = "PLAN"

    class PlanType(models.TextChoices):
        FREE = "FREE", "Free"
        BASIC = "BASIC", "Basic"
        PRO = "PRO", "Pro"

    TipoPlano = PlanType

    tipo = models.CharField(
        max_length=10,
        choices=PlanType.choices,
        default=PlanType.FREE,
        db_index=True,
    )

    limite_usuarios = models.PositiveIntegerField(default=1)
    limite_requisicoes_mes = models.PositiveIntegerField(default=0)

    preco_mensal = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    preco_excedente_requisicao = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    suporte_prioritario = models.BooleanField(default=False)
    permite_multi_unidade = models.BooleanField(default=False)

    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Plano de Assinatura"
        verbose_name_plural = "Planos de Assinatura"
        indexes = [
            models.Index(fields=["tipo", "ativo"]),
            models.Index(fields=["ativo"]),
        ]

    def __str__(self) -> str:
        return self.nome or self.tipo
