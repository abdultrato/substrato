from django.db import models

from core.mixins.model.description import DescriptionMixin
from core.mixins.model.order import OrderMixin
from core.models import CoreModel


class Insurer(DescriptionMixin, OrderMixin, CoreModel):
    """
    Cadastro de seguradoras/planos de saude.
    """

    prefix = "SEG"

    external_code = models.CharField(
        db_column="external_code",
        verbose_name="Código externo",
        max_length=60,
        blank=True,
        null=True,
        db_index=True,
    )
    email = models.EmailField("E-mail", blank=True, null=True)
    phone = models.CharField(
        db_column="phone",
        verbose_name="Telefone",
        max_length=30, blank=True, null=True)

    # `active` e um atributo de negocio (diferente do soft delete)
    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativa",
        default=True, db_index=True)

    # Compatibilidade com filtros/viewsets gerados
    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativa",
        default=True, db_index=True)

    class Meta:
        db_table = "seguradora_seguradora"
        verbose_name = "Seguradora"
        verbose_name_plural = "Seguradoras"

    def __str__(self) -> str:
        return self.name or f"Seguradora {self.pk}"
