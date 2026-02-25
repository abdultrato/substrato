from django.conf import settings
from django.db import models as m
from django.utils import timezone

from .managers import ActiveManager


# =========================================================
# SOFT DELETE
# =========================================================
class SoftDeleteModel(m.Model):
    deletado = m.BooleanField(default=False, db_index=True)
    deletado_em = m.DateTimeField(null=True, blank=True)

    def delete(self, using=None, keep_parents=False):
        self.deletado = True
        self.deletado_em = timezone.now()
        self.save(update_fields=["deletado", "deletado_em"])

    def hard_delete(self):
        super().delete()

    class Meta:
        abstract = True


# =========================================================
# STATUS ATIVO
# =========================================================
class ActiveStatusModel(m.Model):
    ativo = m.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True


# =========================================================
# TIMESTAMPS
# =========================================================
class TimeStampedModel(m.Model):
    criado_em = m.DateTimeField(auto_now_add=True, db_index=True)
    atualizado_em = m.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# =========================================================
# AUDITORIA
# =========================================================
class AuditModel(m.Model):
    criado_por = m.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=m.SET_NULL,
        related_name="%(class)s_criado_por",
    )

    atualizado_por = m.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=m.SET_NULL,
        related_name="%(class)s_atualizado_por",
    )

    class Meta:
        abstract = True


# =========================================================
# CUSTOM ID
# =========================================================
class CustomIDMixin(m.Model):
    id_custom = m.CharField(
        max_length=24,
        unique=True,
        db_index=True,
        editable=False,
    )

    prefixo = None

    class Meta:
        abstract = True


# =========================================================
# BASE CORPORATIVA
# =========================================================
class CoreModel(
    CustomIDMixin,
    SoftDeleteModel,
    ActiveStatusModel,
    TimeStampedModel,
    AuditModel,
):
    """
    Base entidades persistentes.

    ✔ Soft delete seguro
    ✔ Status ativo
    ✔ Auditoria
    ✔ Timestamps automáticos
    ✔ ID corporativo
    ✔ Query filtering inteligente
    """

    objects = ActiveManager()
    all_objects = m.Manager()

    class Meta:
        abstract = True

        # índices otimizados para PostgreSQL
        indexes = [
            m.Index(fields=["ativo", "deletado"]),
            m.Index(fields=["deletado", "criado_em"]),
            m.Index(fields=["criado_em"]),
        ]
