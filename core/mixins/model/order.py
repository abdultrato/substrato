"""Mixin para campo `order` (inteiro) com index."""

from django.db import models


class OrderMixin(models.Model):
    """
    Defines logical ordering.

    ✔ used para layout de laudos
    ✔ ordenação clínica
    """

    order = models.PositiveIntegerField(
        default=1,
        db_index=True,
    )

    class Meta:
        abstract = True
        ordering = ["order"]
