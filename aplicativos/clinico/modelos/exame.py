from django.core.exceptions import ValidationError as ve
from django.core.validators import MinValueValidator as mvv
from django.db import models as m

from frontend.billing.models.fields.laboratory import (
    MetodoField as mf,
    SetorField as s,
)
from frontend.billing.models.fields.money import MoneyField as p

from .nucleo import (
    CoreModel as c,
)
from .mixins import CodigoMixin as cm, NomeMixin as nm


class Exame(nm, cm, c):
    """
    Cadastro corporativo de exames laboratoriais.
    """

    trl_horas = m.PositiveIntegerField(default=24)

    preco = p(
        default=0,
        validators=[mvv(0)],
        help_text="Preço bruto do exame (sem IVA).",
    )

    metodo = mf()
    setor = s()

    class Meta:
        verbose_name = "Exame"
        verbose_name_plural = "Exames"
        ordering = ["nome"]
        indexes = [
            m.Index(fields=["codigo"]),
            m.Index(fields=["nome"]),
        ]

    def __str__(self):
        return self.nome

    def clean(self):
        if self.preco is None:
            raise ve({"preco": "O exame deve possuir um preço."})
