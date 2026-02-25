from datetime import date

from django.db import models

from frontend.constants import Genero, Proveniencia, RacaOrigem, TipoDocumento

from .nucleo import (
    CoreModel as cm,
)
from .fields import LowerEmailField, NomeField, TelefoneField


class Paciente(cm):
    """
    Registro corporativo de pacientes.
    """

    prefixo = "PAC"

    nome = NomeField()

    data_nascimento = models.DateField(null=True, blank=True)

    genero = models.CharField(
        max_length=10,
        choices=Genero.choices,
        blank=True,
    )

    raca_origem = models.CharField(
        max_length=20,
        choices=RacaOrigem.choices,
        default=RacaOrigem.NEGRA,
    )

    tipo_documento = models.CharField(
        max_length=50,
        choices=TipoDocumento.choices,
        default=TipoDocumento.BI,
    )

    numero_id = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
    )

    morada = models.CharField(max_length=120)

    contacto = TelefoneField()

    email = LowerEmailField(unique=True, blank=True, null=True)

    proveniencia = models.CharField(
        max_length=50,
        choices=Proveniencia.choices,
        blank=True,
        default=Proveniencia.OUTRO,
    )

    data_registo = models.DateField(auto_now_add=True)

    class Meta:
        verbose_name = "Paciente"
        verbose_name_plural = "Pacientes"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["nome"]),
            models.Index(fields=["numero_id"]),
        ]

    def idade(self):
        """
        Cálculo clínico preciso:
        ✔ dias para recém-nascidos
        ✔ semanas para neonatais
        ✔ meses para lactentes
        ✔ anos para crianças/adultos
        """
        if not self.data_nascimento:
            return "—"

        hoje = date.today()
        dias = (hoje - self.data_nascimento).days

        if dias < 0:
            return "—"

        if dias <= 28:
            return f"{dias} dias"

        if dias <= 90:
            semanas = dias // 7
            return f"{semanas} semanas"

        if dias < 730:
            meses = dias // 30
            return f"{meses} meses"

        anos = dias // 365
        return f"{anos} anos"
