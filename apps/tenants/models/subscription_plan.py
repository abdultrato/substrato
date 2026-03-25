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
    prefix = "PLAN"

    class PlanType(models.TextChoices):
        FREE = "FREE", "Free"
        BASIC = "BASIC", "Basic"
        PRO = "PRO", "Pro"

    TipoPlano = PlanType

    type = models.CharField(

        db_column="type",

        max_length=10,
        choices=PlanType.choices,
        default=PlanType.FREE,
        db_index=True,
    )

    user_limit = models.PositiveIntegerField(

        db_column="user_limit",

        default=1)
    monthly_request_limit = models.PositiveIntegerField(
        db_column="monthly_request_limit",
        default=0)

    monthly_price = models.DecimalField(

        db_column="monthly_price",

        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    request_overage_price = models.DecimalField(
        db_column="request_overage_price",
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    priority_support = models.BooleanField(

        db_column="priority_support",

        default=False)
    allows_multi_unit = models.BooleanField(
        db_column="allows_multi_unit",
        default=False)

    active = models.BooleanField(

        db_column="active",

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
