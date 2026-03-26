from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from core.mixins.audit import AuditMixin
from core.mixins.identifier import IdentifierMixin
from core.mixins.model.description import DescriptionMixin
from core.mixins.model.name import NameMixin
from core.mixins.model.order import OrderMixin
from core.mixins.soft_delete import SoftDeleteMixin
from core.mixins.versioning import VersioningMixin
from core.models.base import BaseModel


class SubscriptionPlan(
    NameMixin,
    DescriptionMixin,
    OrderMixin,
    IdentifierMixin,
    AuditMixin,
    VersioningMixin,
    SoftDeleteMixin,
    BaseModel,
):
    prefix = "PLAN"

    class PlanType(models.TextChoices):
        FREE = "FREE", "Free"
        BASIC = "BASIC", "Basic"
        PRO = "PRO", "Pro"
    type = models.CharField(
        db_column="type",
        verbose_name="Tipo",
        max_length=10,
        choices=PlanType.choices,
        default=PlanType.FREE,
        db_index=True,
    )

    user_limit = models.PositiveIntegerField(
        db_column="user_limit",
        verbose_name="Limite de usuários",
        default=1)
    monthly_request_limit = models.PositiveIntegerField(
        db_column="monthly_request_limit",
        verbose_name="Limite de requisições mensais",
        default=0)

    monthly_price = models.DecimalField(
        db_column="monthly_price",
        verbose_name="Preço mensal",
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    request_overage_price = models.DecimalField(
        db_column="request_overage_price",
        verbose_name="Preço por excesso",
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    priority_support = models.BooleanField(
        db_column="priority_support",
        verbose_name="Suporte prioritário",
        default=False)
    allows_multi_unit = models.BooleanField(
        db_column="allows_multi_unit",
        verbose_name="Permite multiunidade",
        default=False)

    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativo",
        default=True, db_index=True)

    class Meta:
        db_table = "inquilinos_planoassinatura"
        verbose_name = "Plano de Assinatura"
        verbose_name_plural = "Planos de Assinatura"
        indexes = [
            models.Index(fields=["type", "active"]),
            models.Index(fields=["active"]),
        ]

    def __str__(self) -> str:
        return self.name or self.type
