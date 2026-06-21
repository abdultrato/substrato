"""Mixin para gerar custom_id incremental por prefixo e data."""

from django.db import IntegrityError, models

from core.identity.custom_id import generate_custom_id


class CustomIdentifierMixin(models.Model):
    """
    Generates identifiers using CONTEXT-AAAAMMDD/00000001.
    """

    custom_id = models.CharField(
        db_column="custom_id",
        max_length=30,
        unique=True,
        db_index=True,
        editable=False,
        blank=True,
        null=True,
        verbose_name="Código",
    )

    prefix = None

    class Meta:
        abstract = True

    # -----------------------------------------------------

    def generate_identifier(self):
        if self.custom_id or not self.prefix:
            return

        self.custom_id = generate_custom_id(self.prefix, self.__class__)

    # -----------------------------------------------------

    def save(self, *args, **kwargs):
        if self.custom_id or not self.prefix:
            return super().save(*args, **kwargs)

        for attempt in range(5):
            self.generate_identifier()
            update_fields = kwargs.get("update_fields")
            if update_fields is not None and "custom_id" not in update_fields:
                kwargs["update_fields"] = [*update_fields, "custom_id"]
            try:
                return super().save(*args, **kwargs)
            except IntegrityError:
                self.custom_id = None
                if attempt == 4:
                    raise
        return None
