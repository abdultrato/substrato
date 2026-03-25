from django.db import models
from django.utils import timezone
from django_countries.fields import CountryField

from core.constants.document_types import TipoDocumento
from core.constants.genero import Genero
from core.constants.provenance import Proveniencia
from core.constants.raca_origem import RacaOrigem
from core.models.base import CoreModel
from infrastructure.orm.fields.email_field import NormalizedEmailField
from infrastructure.orm.fields.phone_field import PhoneField


class Patient(CoreModel):
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
        help_text="Preencher se a paciente estiver gestante.",
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

    # Endereço (campos reais) para evitar JSON no admin/frontend e permitir
    # preenchimento estruturado.
    endereco_rua = models.CharField(
        verbose_name="Rua",
        max_length=120,
        blank=True,
        default="",
    )
    endereco_numero = models.CharField(
        verbose_name="Número",
        max_length=30,
        blank=True,
        default="",
    )
    endereco_bairro = models.CharField(
        verbose_name="Bairro",
        max_length=120,
        blank=True,
        default="",
    )
    endereco_cidade = models.CharField(
        verbose_name="Cidade",
        max_length=120,
        blank=True,
        default="",
    )
    endereco_provincia = models.CharField(
        verbose_name="Província",
        max_length=120,
        blank=True,
        default="",
    )
    endereco_codigo_postal = models.CharField(
        verbose_name="Código postal",
        max_length=30,
        blank=True,
        default="",
    )
    endereco_pais = CountryField(
        verbose_name="País",
        blank=True,
        default="MZ",
    )
    endereco_complemento = models.CharField(
        verbose_name="Complemento",
        max_length=255,
        blank=True,
        default="",
    )

    # Compat: mantém o campo "morada" como texto único para consumo/legado.
    # Quando os campos de endereço acima são preenchidos, este campo é
    # atualizado automaticamente.
    morada = models.CharField(
        verbose_name="Morada",
        max_length=255,
        blank=True,
        default="",
        help_text="Texto livre ou resumo (auto) da morada.",
    )

    contacto = PhoneField(
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

    empresa_origem = models.ForeignKey(
        "entidades.Company",
        verbose_name="Empresa (origem)",
        help_text="Para medicina ocupacional, indique a empresa de origem do paciente.",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pacientes",
    )

    class Meta:
        db_table = "clinico_paciente"
        verbose_name = "Entrada"
        verbose_name_plural = "Entradas"

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
            models.Index(fields=["empresa_origem"]),
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

        hoje = timezone.localdate()
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
    # MORADA (TEXTO RESUMO)
    # =========================================================

    def morada_formatada(self) -> str:
        parts = []
        for v in (
            self.endereco_rua,
            self.endereco_numero,
            self.endereco_bairro,
            self.endereco_cidade,
            self.endereco_provincia,
            self.endereco_codigo_postal,
            self.endereco_complemento,
        ):
            txt = (v or "").strip()
            if txt:
                parts.append(txt)
        return ", ".join(parts)

    def save(self, *args, **kwargs):
        # Se o endereço estruturado for usado, o "morada" vira um resumo
        # consistente. Se não houver dados estruturados, preserva texto livre.
        endereco_estruturado_usado = any(
            (v or "").strip()
            for v in (
                self.endereco_rua,
                self.endereco_numero,
                self.endereco_bairro,
                self.endereco_cidade,
                self.endereco_provincia,
                self.endereco_codigo_postal,
                self.endereco_complemento,
            )
        )
        if endereco_estruturado_usado:
            self.morada = self.morada_formatada()
        else:
            self.morada = (self.morada or "").strip()

        super().save(*args, **kwargs)

    # =========================================================
    # IDADE PARA MOTOR CLÍNICO (PRECISÃO ABSOLUTA)
    # =========================================================

    def idade_em_dias(self) -> int | None:

        if not self.data_nascimento:
            return None

        dias = (timezone.localdate() - self.data_nascimento).days

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

