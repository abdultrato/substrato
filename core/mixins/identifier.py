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
    prefixo = None

    class Meta:
        abstract = True

    def generate_identifier(self):
        prefix = self.prefix or self.prefixo
        if self.custom_id or not prefix:
            return

        timestamp = now().strftime("%Y%m%d-%H%M")

        number = self.pk or 0

        self.custom_id = f"{prefix}-{timestamp}-{number:04d}"

    def save(self, *args, **kwargs):
        criando = self._state.adding

        if criando and not self.pk:
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


IdentificadorMixin = IdentifierMixin
