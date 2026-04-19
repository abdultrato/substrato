# LOCAL: nucleo/mixins/audit.py

from django.conf import settings
"""Campos de auditoria (created/updated by/at)."""

from django.db import models

from infrastructure.context.request_user import get_current_user


class AuditMixin(models.Model):
    created_at = models.DateTimeField(
        db_column="created_at",
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        db_column="updated_at",
        auto_now=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        db_column="created_by_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_criado",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        db_column="updated_by_id",
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
