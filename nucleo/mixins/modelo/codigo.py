from django.db import models


class CodigoMixin(models.Model):
    """
    Código identificador corporativo.

    ✔ único
    ✔ padronizado em uppercase
    ✔ indexado
    """

    codigo = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.codigo:
            self.codigo = self.codigo.strip().upper()
        super().save(*args, **kwargs)
