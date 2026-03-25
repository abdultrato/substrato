# LOCAL: nucleo/mixins/audit.py

from django.conf import settings
from django.db import models

from infrastructure.context.request_user import get_current_user


class AuditMixin(models.Model):
    created_at = models.DateTimeField(
        db_column="criado_em",
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        db_column="atualizado_em",
        auto_now=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        db_column="criado_por_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_criado",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        db_column="atualizado_por_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_atualizado",
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        actor = get_current_user()
        is_create = not self.pk

        if actor and getattr(actor, "is_authenticated", False):
            if is_create and not self.created_by_id:
                self.created_by = actor

            self.updated_by = actor

            update_fields = kwargs.get("update_fields")

            if update_fields is not None:
                fields = set(update_fields)

                if is_create:
                    fields.add("created_by")

                fields.add("updated_by")

                kwargs["update_fields"] = list(fields)

        super().save(*args, **kwargs)

    @property
    def criado_em(self):
        return self.created_at

    @criado_em.setter
    def criado_em(self, value):
        self.created_at = value

    @property
    def atualizado_em(self):
        return self.updated_at

    @atualizado_em.setter
    def atualizado_em(self, value):
        self.updated_at = value

    @property
    def criado_por(self):
        return self.created_by

    @criado_por.setter
    def criado_por(self, value):
        self.created_by = value

    @property
    def criado_por_id(self):
        return self.created_by_id

    @criado_por_id.setter
    def criado_por_id(self, value):
        self.created_by_id = value

    @property
    def atualizado_por(self):
        return self.updated_by

    @atualizado_por.setter
    def atualizado_por(self, value):
        self.updated_by = value

    @property
    def atualizado_por_id(self):
        return self.updated_by_id

    @atualizado_por_id.setter
    def atualizado_por_id(self, value):
        self.updated_by_id = value


AuditoriaMixin = AuditMixin
