from django.db import models
from django.utils import timezone

from core.mixins.audit import AuditMixin
from core.mixins.identifier import IdentifierMixin
from core.mixins.model.name import NameMixin
from core.mixins.soft_delete import SoftDeleteMixin
from core.mixins.versioning import VersioningMixin
from core.models.base import BaseModel


class Tenant(
    NameMixin,
    IdentifierMixin,
    AuditMixin,
    VersioningMixin,
    SoftDeleteMixin,
    BaseModel,
):
    prefix = "TN"

    class CommercialStatus(models.TextChoices):
        TRIAL = "TRIAL", "Trial"
        ACTIVE = "ATIVO", "Ativo"
        SUSPENDED = "SUSPENSO", "Suspenso"

    identifier = models.SlugField(

        db_column="identifier",

        max_length=80, unique=True, db_index=True)
    domain = models.CharField(
        db_column="domain",
        max_length=255, blank=True, null=True, db_index=True)
    active = models.BooleanField(
        db_column="active",
        default=True, db_index=True)

    commercial_status = models.CharField(

        db_column="commercial_status",

        max_length=10,
        choices=CommercialStatus.choices,
        default=CommercialStatus.TRIAL,
        db_index=True,
    )
    trial_until = models.DateField(
        db_column="trial_until",
        blank=True, null=True)
    blocked_at = models.DateTimeField(
        db_column="blocked_at",
        blank=True, null=True)

    class Meta:
        db_table = "inquilinos_inquilino"
        verbose_name = "Inquilino"
        verbose_name_plural = "Inquilinos"
        indexes = [
            models.Index(fields=["identifier"]),
            models.Index(fields=["domain"]),
            models.Index(fields=["active"]),
        ]

    def is_blocked(self) -> bool:
        return self.blocked_at is not None

    def is_in_trial(self) -> bool:
        if self.commercial_status != Tenant.CommercialStatus.TRIAL:
            return False
        if not self.trial_until:
            return True
        today = timezone.localdate()
        return self.trial_until >= today

    def get_active_subscription(self):
        return self.assinaturas.filter(status="ATIVA").order_by("-start_date").first()

    @property
    def plan(self):
        subscription = self.get_active_subscription()
        return getattr(subscription, "plan", None)

    def __str__(self) -> str:
        return self.name or self.identifier


Tenant.plan = Tenant.plan
