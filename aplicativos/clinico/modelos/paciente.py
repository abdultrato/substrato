from datetime import date
from django.db import models

from nucleo.modelos.base import CoreModel

from nucleo.constantes.genero import Genero
from nucleo.constantes.proveniencia import Proveniencia
from nucleo.constantes.raca_origem import RacaOrigem
from nucleo.constantes.tipos_documento import TipoDocumento

from infraestrutura.orm.fields.telefone_field import TelefoneField
from infraestrutura.orm.fields.email_field import LowerEmailField
from infraestrutura.orm.fields.nome_field import NomeField


class Paciente(CoreModel):
    """
    Entidade corporativa de paciente.
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

    morada = models.CharField(max_length=150)

    contacto = TelefoneField()

    email = LowerEmailField(
        unique=True,
        blank=True,
        null=True,
    )

    proveniencia = models.CharField(
        max_length=50,
        choices=Proveniencia.choices,
        blank=True,
        default=Proveniencia.OUTRO,
    )

    class Meta:
        verbose_name = "Paciente"
        verbose_name_plural = "Pacientes"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["nome"]),
            models.Index(fields=["numero_id"]),
            models.Index(fields=["genero"]),
            models.Index(fields=["data_nascimento"]),
        ]

    # =========================================================
    # CÁLCULO DE IDADE CLÍNICA
    # =========================================================
    def idade(self):
        """
        Cálculo clínico adaptativo.
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
            return f"{dias // 7} semanas"

        if dias < 730:
            return f"{dias // 30} meses"

        return f"{dias // 365} anos"
