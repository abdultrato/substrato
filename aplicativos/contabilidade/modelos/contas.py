from django.db import models
from django.db.models import Q

from nucleo.modelos.base import CoreModel


class TipoConta(models.TextChoices):
    ATIVO = "ATI", "Ativo"
    PASSIVO = "PAS", "Passivo"
    RECEITA = "REC", "Receita"
    DESPESA = "DES", "Despesa"
    PATRIMONIO = "PAT", "Patrimônio"


class Conta(CoreModel):
    tipo = models.CharField(max_length=3, choices=TipoConta.choices)

    class Meta:
        indexes = [
            models.Index(fields=["id_custom"]),
            models.Index(fields=["tipo"]),
            models.Index(fields=["inquilino", "id_custom"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "id_custom"],
                condition=Q(deletado=False),
                name="unique_codigo_conta_por_inquilino",
            )
        ]

    def __str__(self):
        return f"{self.id_custom} - {self.nome}"
