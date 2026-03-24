from django.db import models

from core.mixins.model.description import DescricaoMixin
from core.mixins.model.order import OrdemMixin
from core.models import CoreModel


class Insurer(DescricaoMixin, OrdemMixin, CoreModel):
    """
    Cadastro de seguradoras/planos de saude.
    """

    prefixo = "SEG"

    codigo_externo = models.CharField(
        max_length=60,
        blank=True,
        null=True,
        db_index=True,
    )
    email = models.EmailField(blank=True, null=True)
    telefone = models.CharField(max_length=30, blank=True, null=True)

    # `ativa` e um atributo de negocio (diferente do soft delete)
    ativa = models.BooleanField(default=True, db_index=True)

    # Compatibilidade com filtros/viewsets gerados
    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Seguradora"
        verbose_name_plural = "Seguradoras"

    def __str__(self) -> str:
        return self.nome or f"Seguradora {self.pk}"
