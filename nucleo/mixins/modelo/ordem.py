from django.db import models


class OrdemMixin(models.Model):
    """
    Define ordenação lógica.

    ✔ usado para layout de laudos
    ✔ ordenação clínica
    """

    ordem = models.PositiveIntegerField(
        default=1,
        db_index=True,
    )

    class Meta:
        abstract = True
        ordering = ["ordem"]
