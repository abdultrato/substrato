import uuid

from django.db import models


class CodeMixin(models.Model):
    """
    Enterprise code generation with a prefix.
    """

    custom_id = models.CharField(
        db_column="id_custom",
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
        return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

    def save(self, *args, **kwargs):
        if not self.custom_id:
            self.custom_id = self.generate_code()
        super().save(*args, **kwargs)


CodigoMixin = CodeMixin
CodeMixin._resolver_prefix = CodeMixin._resolve_prefix
CodeMixin.gerar_code = CodeMixin.generate_code
