"""Mixin para identifiers textuais únicos (slug/código)."""

from django.db import models
from django.utils.timezone import now


class IdentifierMixin(models.Model):
    custom_id = models.CharField(
        db_column="custom_id",
        max_length=40,
        unique=True,
        db_index=True,
        editable=False,
        blank=True,
        null=True,
    )

    prefix = None

    class Meta:
        abstract = True

    def generate_identifier(self):
        if self.custom_id or not self.prefix:
            return

        timestamp = now().strftime("%Y%m%d-%H%M")

        number = self.pk or 0

        self.custom_id = f"{self.prefix}-{timestamp}-{number:04d}"

    def save(self, *args, **kwargs):
        is_creating = self._state.adding

        if is_creating and not self.pk:
            super().save(*args, **kwargs)

            self.generate_identifier()

            return super().save(update_fields=["custom_id"])

        return super().save(*args, **kwargs)

    @property
    def id_custom(self):
        return self.custom_id

    @id_custom.setter
    def id_custom(self, value):
        self.custom_id = value
