from django.conf import settings
from django.db import models
from django.utils import timezone
from nucleo.mixins.escopo_inquilino import InquilinoMixin
from nucleo.mixins.modelo.codigo import CodigoMixin
from nucleo.mixins.modelo.nome import NomeMixin
from nucleo.mixins.modelo.ordem import OrdemMixin
from nucleo.mixins.modelo.descricao import DescricaoMixin

from .managers import ManagerAtivo


# =========================================================
# STATUS + SOFT DELETE
# =========================================================

class StatusModel(models.Model):
    ativo = models.BooleanField(default=True, db_index=True)
    deletado = models.BooleanField(default=False, db_index=True)
    deletado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.deletado = True
        self.deletado_em = timezone.now()
        self.save(update_fields=["deletado", "deletado_em"])

    def hard_delete(self):
        super().delete()


# =========================================================
# TIMESTAMP + AUDITORIA
# =========================================================

class AuditTimestampModel(models.Model):
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(class)s_criado_por",
    )

    atualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(class)s_atualizado_por",
    )

    class Meta:
        abstract = True


# =========================================================
# CORE MODEL
# =========================================================

class CoreModel(
    StatusModel,
    AuditTimestampModel,
    CodigoMixin,
    NomeMixin,
    OrdemMixin,
    DescricaoMixin, InquilinoMixin,
    models.Model,
):
    """
    Modelo base corporativo.
    """

    objects = ManagerAtivo()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["ativo"]),
            models.Index(fields=["deletado"]),
        ]

# =========================================================
# CORE MODEL
# =========================================================

class InqCoreModel(
    StatusModel,
    AuditTimestampModel,
    CodigoMixin,
    NomeMixin,
    OrdemMixin,
    DescricaoMixin,
    models.Model,
):
    """
    Modelo base corporativo para inquilino.
    """

    objects = ManagerAtivo()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["ativo"]),
            models.Index(fields=["deletado"]),
        ]
