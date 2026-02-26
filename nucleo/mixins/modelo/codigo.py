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
    )

    prefixo = None  # Deve ser definido no model

    class Meta:
        abstract = True

    def gerar_codigo(self):
        if not self.prefixo:
            raise ValueError("Defina o prefixo no modelo.")

        return f"{self.prefixo}-{uuid.uuid4().hex[:8].upper()}"

    def save(self, *args, **kwargs):
        if not self.id_custom:
            self.id_custom = self.gerar_codigo()
        super().save(*args, **kwargs)
