from django.conf import settings
from django.db import models
from django.utils import timezone

from .managers import ManagerAtivo


class SoftDeleteModel(models.Model):
    deletado = models.BooleanField(default=False, db_index=True)
    deletado_em = models.DateTimeField(null=True, blank=True)

    def delete(self, using=None, keep_parents=False):
        self.deletado = True
        self.deletado_em = timezone.now()
        self.save(update_fields=["deletado", "deletado_em"])

    class Meta:
        abstract = True


class ActiveStatusModel(models.Model):
    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditModel(models.Model):
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


class CoreModel(
    SoftDeleteModel,
    ActiveStatusModel,
    TimeStampedModel,
    AuditModel,
):
    objects = ManagerAtivo()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["ativo", "deletado"]),
            models.Index(fields=["criado_em"]),
        ]
