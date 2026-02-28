from django.db import models
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

from nucleo.modelos.base import InqCoreModel


class Inquilino(InqCoreModel):
    """
    Tenant isolado do sistema (SaaS multi-tenant).
    """

    prefixo = "INQ"

    # =====================================================
    # IDENTIFICAÇÃO
    # =====================================================

    identificador = models.SlugField(
        unique=True,
        max_length=100,
        help_text=_("Identificador único do tenant."),
    )

    nome = models.CharField(
        max_length=255,
        db_index=True,
        help_text=_("Nome comercial do tenant."),
    )

    dominio = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r"^[a-z0-9.-]+\.[a-z]{2,}$",
                message=_("Domínio inválido."),
            )
        ],
        help_text=_("Domínio customizado opcional."),
    )

    # =====================================================
    # STATUS TÉCNICO
    # =====================================================

    ativo = models.BooleanField(
        default=True,
        db_index=True,
    )

    # =====================================================
    # STATUS COMERCIAL
    # =====================================================

    class StatusComercial(models.TextChoices):
        TRIAL = "TRIAL", "Trial"
        ATIVO = "ATIVO", "Ativo"
        INADIMPLENTE = "INADIMPLENTE", "Inadimplente"
        SUSPENSO = "SUSPENSO", "Suspenso"
        CANCELADO = "CANCELADO", "Cancelado"

    status_comercial = models.CharField(
        max_length=20,
        choices=StatusComercial.choices,
        default=StatusComercial.TRIAL,
        db_index=True,
    )

    trial_ate = models.DateField(
        null=True,
        blank=True,
    )

    bloqueado_em = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = _("Inquilino")
        verbose_name_plural = _("Inquilinos")
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["identificador"]),
            models.Index(fields=["ativo"]),
            models.Index(fields=["dominio"]),
            models.Index(fields=["status_comercial"]),
        ]

    # =====================================================
    # REGRAS
    # =====================================================

    def esta_em_trial(self):
        return bool(
            self.trial_ate
            and timezone.now().date() <= self.trial_ate
        )

    def esta_bloqueado(self):
        return (
            not self.ativo
            or self.status_comercial in {
                self.StatusComercial.SUSPENSO,
                self.StatusComercial.INADIMPLENTE,
                self.StatusComercial.CANCELADO,
            }
        )

    @property
    def assinatura_ativa(self):
        from .assinatura import AssinaturaTenant

        return (
            self.assinaturas
            .filter(status=AssinaturaTenant.Status.ATIVA)
            .select_related("plano")
            .first()
        )

    def obter_plano_atual(self):
        assinatura = self.assinatura_ativa
        return assinatura.plano if assinatura else None

    def __str__(self):
        return f"{self.nome} ({self.identificador})"
