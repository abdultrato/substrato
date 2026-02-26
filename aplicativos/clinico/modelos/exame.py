from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from nucleo.modelos.base import ModeloBase
from nucleo.mixins.modelo.nome import NomeMixin
from nucleo.mixins.modelo.codigo import CodigoMixin

from infraestrutura.orm.fields.dinheiro_field import DinheiroField
from infraestrutura.orm.fields.metodo_field import MetodoField
from infraestrutura.orm.fields.setor_field import SetorField
from nucleo.modelos.base import CoreModel


class Exame(CoreModel):
    """
    Cadastro corporativo de exames laboratoriais.
    """

    trl_horas = models.PositiveIntegerField(
        default=24, help_text="Tempo de resposta em horas."
    )

    preco = DinheiroField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Preço bruto do exame (sem IVA).",
    )

    metodo = MetodoField()
    setor = SetorField()

    class Meta:
        verbose_name = "Exame"
        verbose_name_plural = "Exames"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["codigo"]),
            models.Index(fields=["nome"]),
        ]

    def clean(self):
        if self.preco is None:
            raise ValidationError({"preco": "O exame deve possuir um preço."})

    def __str__(self):
        return self.nome
