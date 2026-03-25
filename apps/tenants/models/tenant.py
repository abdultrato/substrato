from django.db import models
from django.utils import timezone

from core.mixins.audit import AuditoriaMixin
from core.mixins.identifier import IdentificadorMixin
from core.mixins.model.name import NomeMixin
from core.mixins.soft_delete import SoftDeleteMixin
from core.mixins.versioning import VersionamentoMixin
from core.models.base import BaseModel


class Tenant(
    NomeMixin,
    IdentificadorMixin,
    AuditoriaMixin,
    VersionamentoMixin,
    SoftDeleteMixin,
    BaseModel,
):
    prefix = "TN"

    class StatusComercial(models.TextChoices):
        TRIAL = "TRIAL", "Trial"
        ATIVO = "ATIVO", "Ativo"
        SUSPENSO = "SUSPENSO", "Suspenso"

    identifier = models.SlugField(

        db_column="identificador",

        max_length=80, unique=True, db_index=True)
    domain = models.CharField(
        db_column="dominio",
        max_length=255, blank=True, null=True, db_index=True)
    active = models.BooleanField(
        db_column="ativo",
        default=True, db_index=True)

    commercial_status = models.CharField(

        db_column="status_comercial",

        max_length=10,
        choices=StatusComercial.choices,
        default=StatusComercial.TRIAL,
        db_index=True,
    )
    trial_until = models.DateField(
        db_column="trial_ate",
        blank=True, null=True)
    blocked_at = models.DateTimeField(
        db_column="bloqueado_em",
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

    def esta_bloqueado(self) -> bool:
        return self.blocked_at is not None

    def esta_em_trial(self) -> bool:
        if self.commercial_status != Tenant.StatusComercial.TRIAL:
            return False
        if not self.trial_until:
            return True
        hoje = timezone.localdate()
        return self.trial_until >= hoje

    def get_active_subscription(self):
        return self.assinaturas.filter(status="ATIVA").order_by("-start_date").first()

    @property
    def plan(self):
        assinatura = self.get_active_subscription()
        return getattr(assinatura, "plan", None)

    def __str__(self) -> str:
        return self.name or self.identifier


Tenant.obter_assinatura_active = Tenant.get_active_subscription
Tenant.plan = Tenant.plan
