"""Mixin para códigos gerados automaticamente."""

from django.db import IntegrityError
from django.db import models

from core.identity.custom_id import generate_custom_id


class CodeMixin(models.Model):
    """
    Enterprise code generation with a prefix.
    """

    custom_id = models.CharField(
        db_column="custom_id",
        max_length=30,
        unique=True,
        db_index=True,
        editable=False,
        verbose_name="Código",
    )

    prefix = None  # Deve ser definido no model

    class Meta:
        abstract = True

    def _resolve_prefix(self):
        if self.prefix:
            return str(self.prefix).strip().upper()

        class_name = self.__class__.__name__
        return (class_name[:3] or "MOD").upper()

    def generate_code(self):
        prefix = self._resolve_prefix()
        return generate_custom_id(prefix, self.__class__)

    def save(self, *args, **kwargs):
        if self.custom_id:
            return super().save(*args, **kwargs)

        for attempt in range(5):
            self.custom_id = self.generate_code()
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


CodigoMixin = CodeMixin
CodeMixin._resolver_prefix = CodeMixin._resolve_prefix
