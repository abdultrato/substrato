# LOCAL: nucleo/mixins/soft_delete.py

from django.db import models
from django.utils import timezone

from infrastructure.context.request_user import get_current_user


class SoftDeleteMixin(models.Model):
    deleted = models.BooleanField(db_column="deleted", default=False, db_index=True)
    deleted_at = models.DateTimeField(db_column="deleted_at", null=True, blank=True)
    deleted_by = models.ForeignKey(
        "identidade.User",
        db_column="deleted_by_id",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(class)s_deleted",
    )

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        actor = get_current_user()

        self.deleted = True
        self.deleted_at = timezone.now()

        if actor and getattr(actor, "is_authenticated", False):
            self.deleted_by = actor

        self.save(update_fields=["deleted", "deleted_at", "deleted_by"])

    @property
    def deletado(self):
        return self.deleted

    @deletado.setter
    def deletado(self, value):
        self.deleted = value

    @property
    def deletado_em(self):
        return self.deleted_at

    @deletado_em.setter
    def deletado_em(self, value):
        self.deleted_at = value

    @property
    def deletado_por(self):
        return self.deleted_by

    @deletado_por.setter
    def deletado_por(self, value):
        self.deleted_by = value

    @property
    def deletado_por_id(self):
        return self.deleted_by_id

    @deletado_por_id.setter
    def deletado_por_id(self, value):
        self.deleted_by_id = value
