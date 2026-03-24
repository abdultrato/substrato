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
    prefixo = "TN"

    class StatusComercial(models.TextChoices):
        TRIAL = "TRIAL", "Trial"
        ATIVO = "ATIVO", "Ativo"
        SUSPENSO = "SUSPENSO", "Suspenso"

    identificador = models.SlugField(max_length=80, unique=True, db_index=True)
    dominio = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    ativo = models.BooleanField(default=True, db_index=True)

    status_comercial = models.CharField(
        max_length=10,
        choices=StatusComercial.choices,
        default=StatusComercial.TRIAL,
        db_index=True,
    )
    trial_ate = models.DateField(blank=True, null=True)
    bloqueado_em = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Inquilino"
        verbose_name_plural = "Inquilinos"
        indexes = [
            models.Index(fields=["identificador"]),
            models.Index(fields=["dominio"]),
            models.Index(fields=["ativo"]),
        ]

    def esta_bloqueado(self) -> bool:
        return self.bloqueado_em is not None

    def esta_em_trial(self) -> bool:
        if self.status_comercial != Tenant.StatusComercial.TRIAL:
            return False
        if not self.trial_ate:
            return True
        hoje = timezone.localdate()
        return self.trial_ate >= hoje

    def get_active_subscription(self):
        return self.assinaturas.filter(status="ATIVA").order_by("-data_inicio").first()

    @property
    def plan(self):
        assinatura = self.get_active_subscription()
        return getattr(assinatura, "plano", None)

    def __str__(self) -> str:
        return self.nome or self.identificador


Tenant.obter_assinatura_ativa = Tenant.get_active_subscription
Tenant.plano = Tenant.plan
