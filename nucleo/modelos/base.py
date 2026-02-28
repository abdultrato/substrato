from django.conf import settings
from django.db import models
from django.utils import timezone
from nucleo.mixins.escopo_inquilino import InquilinoMixin
from nucleo.mixins.modelo.codigo import CodigoMixin
from nucleo.mixins.modelo.nome import NomeMixin
from nucleo.mixins.modelo.ordem import OrdemMixin
from nucleo.mixins.modelo.descricao import DescricaoMixin

from .managers import ManagerAtivo


def _get_authenticated_current_user():
    try:
        from infrastrutura.middleware.request_user import get_current_user
    except Exception:
        return None

    user = get_current_user()
    if user and getattr(user, "is_authenticated", False):
        return user
    return None


# =========================================================
# STATUS + SOFT DELETE
# =========================================================

class StatusModel(models.Model):
    ativo = models.BooleanField(default=True, db_index=True)
    deletado = models.BooleanField(default=False, db_index=True)
    deletado_em = models.DateTimeField(null=True, blank=True)
    deletado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(class)s_deletado_por",
    )

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False, user=None):
        self.deletado = True
        self.deletado_em = timezone.now()
        actor = user or _get_authenticated_current_user()

        update_fields = ["deletado", "deletado_em"]

        if actor and hasattr(self, "deletado_por_id"):
            self.deletado_por = actor
            update_fields.append("deletado_por")

        if actor and hasattr(self, "atualizado_por_id"):
            self.atualizado_por = actor
            update_fields.append("atualizado_por")

        if hasattr(self, "atualizado_em"):
            update_fields.append("atualizado_em")

        self.save(update_fields=update_fields)

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

    def save(self, *args, **kwargs):
        actor = _get_authenticated_current_user()
        is_create = not self.pk

        if actor:
            if is_create and hasattr(self, "criado_por_id") and not self.criado_por_id:
                self.criado_por = actor
            if hasattr(self, "atualizado_por_id"):
                self.atualizado_por = actor

            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                fields = set(update_fields)
                if is_create and hasattr(self, "criado_por_id"):
                    fields.add("criado_por")
                if hasattr(self, "atualizado_por_id"):
                    fields.add("atualizado_por")
                kwargs["update_fields"] = list(fields)

        super().save(*args, **kwargs)
        indexes = [
            models.Index(fields=["ativo"]),
            models.Index(fields=["deletado"]),
        ]


# Backward-compatibility aliases used across the project.
ActiveStatusModel = StatusModel
SoftDeleteModel = StatusModel
TimeStampedModel = AuditTimestampModel
AuditModel = AuditTimestampModel
