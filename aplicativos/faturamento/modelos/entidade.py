from django.db import models

from ..models.core import ActiveStatusModel, AuditModel, CoreModel
from ..models.fields import LowerEmailField, NomeField, NuitField, TelefoneField
from ..models.mixins import CustomIDSaveMixin


class Entidade(CustomIDSaveMixin, CoreModel, ActiveStatusModel, AuditModel):
    """
    Entidades conveniadas, seguradoras ou empresas.
    """

    prefixo = "ENT"

    nome = NomeField(unique=True)

    slogan = models.CharField(max_length=150, blank=True)

    endereco_sede = models.CharField(max_length=255, blank=True)

    telefone1 = TelefoneField()
    telefone2 = TelefoneField()

    email = LowerEmailField(blank=True, null=True)

    nuit = NuitField()

    class Meta:
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["nome"]),
        ]

    def __str__(self):
        return self.nome
