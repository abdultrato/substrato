import uuid

from django.db import models


class CodigoMixin(models.Model):
    """
    Geração de código empresarial com prefixo.
    """

    id_custom = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        editable=False,
        verbose_name="ordem",
    )

    prefixo = None  # Deve ser definido no model

    class Meta:
        abstract = True

    def _resolver_prefixo(self):
        if self.prefixo:
            return str(self.prefixo).strip().upper()

        # Fallback seguro para models sem prefixo explícito.
        nome = self.__class__.__name__
        return (nome[:3] or "MOD").upper()

    def gerar_codigo(self):
        prefixo = self._resolver_prefixo()
        return f"{prefixo}-{uuid.uuid4().hex[:8].upper()}"

    def save(self, *args, **kwargs):
        if not self.id_custom:
            self.id_custom = self.gerar_codigo()
        super().save(*args, **kwargs)
