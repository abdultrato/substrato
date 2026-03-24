from django.db import models


class OrderMixin(models.Model):
    """
    Defines logical ordering.

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


OrdemMixin = OrderMixin
