from django.db import models
from django.db.models import Q


class InquilinoMixin(models.Model):
    """
    Mixin multi-tenant corporativo.

    Garante:
    - Escopo por inquilino
    - Índice estratégico
    - Base para constraints condicionais
    """

    inquilino = models.ForeignKey(
        "inquilinos.Inquilino",
        on_delete=models.PROTECT,
        related_name="%(class)ss",
        db_index=True,
    )

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["inquilino"]),
        ]
