from datetime import date

from django.db import models

from infrastrutura.orm.fields.email_field import NormalizedEmailField
from infrastrutura.orm.fields.telefone_field import TelefoneField
from nucleo.constantes.genero import Genero
from nucleo.constantes.proveniencia import Proveniencia
from nucleo.constantes.raca_origem import RacaOrigem
from nucleo.constantes.tipos_documento import TipoDocumento
from nucleo.modelos.base import CoreModel


class Paciente(CoreModel):
    """
    Entidade corporativa de paciente.
    """

    prefixo = "PAC"

    gestante = models.BooleanField(
        verbose_name="Gestante",
        default=False,
    )

    idade_gestacional_semanas = models.PositiveIntegerField(
        verbose_name="Idade gestacional (semanas)",
        null=True,
        blank=True,
        help_text="Preencher apenas se a paciente estiver gestante.",
    )

    data_nascimento = models.DateField(
        verbose_name="Data de nascimento",
        null=True,
        blank=True,
    )

    genero = models.CharField(
        verbose_name="Gênero",
        max_length=10,
        choices=Genero.choices,
        db_index=True,
        default=Genero.FEMENINO,
    )

    raca_origem = models.CharField(
        verbose_name="Raça / Origem",
        max_length=20,
        choices=RacaOrigem.choices,
        default=RacaOrigem.NEGRA,
    )

    tipo_documento = models.CharField(
        verbose_name="Tipo de documento",
        max_length=50,
        choices=TipoDocumento.choices,
        default=TipoDocumento.BI,
    )

    numero_id = models.CharField(
        verbose_name="Número do documento",
        max_length=50,
        unique=True,
        blank=True,
        null=True,
    )

    morada = models.CharField(
        verbose_name="Morada",
        max_length=150,
    )

    contacto = TelefoneField(
        verbose_name="Contacto",
        blank=True,
        null=True,
    )

    email = NormalizedEmailField(
        verbose_name="E-mail",
        unique=True,
        blank=True,
        null=True,
    )

    proveniencia = models.CharField(
        verbose_name="Proveniência",
        max_length=50,
        choices=Proveniencia.choices,
        blank=True,
        default=Proveniencia.CLINICA_EXTERNA,
    )

    class Meta:
        verbose_name = "Paciente"
        verbose_name_plural = "Pacientes"

        ordering = ["nome"]

        indexes = [
            models.Index(
                fields=[
                    "inquilino",
                ]
            ),
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

    idade.short_description = "Idade"

    # =========================================================
    # IDADE PARA MOTOR CLÍNICO (PRECISÃO ABSOLUTA)
    # =========================================================

    def idade_em_dias(self) -> int | None:

        if not self.data_nascimento:
            return None

        dias = (date.today() - self.data_nascimento).days

        return dias if dias >= 0 else None

    def idade_em_meses(self) -> int | None:

        dias = self.idade_em_dias()

        if dias is None:
            return None

        return dias // 30

    def idade_em_anos(self) -> int | None:

        dias = self.idade_em_dias()

        if dias is None:
            return None

        return dias // 365

    def eh_neonato(self) -> bool:

        dias = self.idade_em_dias()

        return dias is not None and dias <= 28

    def eh_lactente(self) -> bool:

        dias = self.idade_em_dias()

        return dias is not None and dias <= 365

    # =========================================================
    # REPRESENTAÇÃO
    # =========================================================

    def __str__(self):
        return f"{self.id_custom} - {self.nome}"
