"""Modelo de paciente com dados demográficos e contato."""

from django.db import models
from django.utils import timezone
from django_countries.fields import CountryField

from core.constants.document_types import DocumentType
from core.constants.gender import Gender
from core.constants.provenance import Provenance
from core.constants.race_origin import RaceOrigin
from core.models.base import CoreModel
from infrastructure.orm.fields.email_field import NormalizedEmailField
from infrastructure.orm.fields.phone_field import PhoneField


class Patient(CoreModel):
    """Entidade corporativa de paciente."""

    prefix = "PAC"  # Prefixo para IDs amigáveis

    pregnant = models.BooleanField(

        db_column="pregnant",

        verbose_name="Gestante",
        default=False,
    )

    gestational_age_weeks = models.PositiveIntegerField(

        db_column="gestational_age_weeks",

        verbose_name="Idade gestacional (semanas)",
        null=True,
        blank=True,
        help_text="Preencher se a patient estiver pregnant.",
    )

    birth_date = models.DateField(

        db_column="birth_date",

        verbose_name="Data de nascimento",
        null=True,
        blank=True,
    )

    gender = models.CharField(

        db_column="gender",

        verbose_name="Gênero",
        max_length=10,
        choices=Gender.choices,
        db_index=True,
        default=Gender.FEMALE,
    )

    race_origin = models.CharField(

        db_column="race_origin",

        verbose_name="Raça / Origem",
        max_length=20,
        choices=RaceOrigin.choices,
        default=RaceOrigin.BLACK,
    )

    document_type = models.CharField(

        db_column="document_type",

        verbose_name="Tipo de documento",
        max_length=50,
        choices=DocumentType.choices,
        default=DocumentType.BI,
    )

    document_number = models.CharField(

        db_column="document_number",

        verbose_name="Número do documento",
        max_length=50,
        unique=True,
        blank=True,
        null=True,
    )

    # Endereço (campos reais) para evitar JSON no admin/frontend e permitir
    # preenchimento estruturado.
    address_street = models.CharField(
        db_column="address_street",
        verbose_name="Rua",
        max_length=120,
        blank=True,
        default="",
    )
    address_number = models.CharField(
        db_column="address_number",
        verbose_name="Número",
        max_length=30,
        blank=True,
        default="",
    )
    address_neighborhood = models.CharField(
        db_column="address_neighborhood",
        verbose_name="Bairro",
        max_length=120,
        blank=True,
        default="",
    )
    address_city = models.CharField(
        db_column="address_city",
        verbose_name="Cidade",
        max_length=120,
        blank=True,
        default="",
    )
    address_province = models.CharField(
        db_column="address_province",
        verbose_name="Província",
        max_length=120,
        blank=True,
        default="",
    )
    address_postal_code = models.CharField(
        db_column="address_postal_code",
        verbose_name="Código postal",
        max_length=30,
        blank=True,
        default="",
    )
    address_country = CountryField(
        db_column="address_country",
        verbose_name="País",
        blank=True,
        default="MZ",
    )
    address_complement = models.CharField(
        db_column="address_complement",
        verbose_name="Complemento",
        max_length=255,
        blank=True,
        default="",
    )

    # Compat: mantém o campo "address" como texto único para consumo/legado.
    # Quando os campos de endereço acima são preenchidos, este campo é
    # atualizado automaticamente.
    address = models.CharField(
        db_column="address",
        verbose_name="Morada",
        max_length=255,
        blank=True,
        default="",
        help_text="Texto livre ou resumo (auto) da address.",
    )

    contact = PhoneField(

        db_column="contact",

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

    provenance = models.CharField(

        db_column="provenance",

        verbose_name="Proveniência",
        max_length=50,
        choices=Provenance.choices,
        blank=True,
        default=Provenance.CLINICA_EXTERNA,
    )

    origin_company = models.ForeignKey(

        "entidades.Company",

        db_column="origin_company_id",
        verbose_name="Empresa (origin)",
        help_text="Para medicina ocupacional, indique a empresa de origin do patient.",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pacientes",
    )

    class Meta:
        db_table = "clinico_paciente"
        verbose_name = "Entrada"
        verbose_name_plural = "Entradas"

        ordering = ["name"]

        indexes = [
            models.Index(
                fields=[
                    "tenant",
                ]
            ),
            models.Index(fields=["name"]),
            models.Index(fields=["document_number"]),
            models.Index(fields=["gender"]),
            models.Index(fields=["birth_date"]),
            models.Index(fields=["origin_company"]),
        ]

    # =========================================================
    # CÁLCULO DE IDADE CLÍNICA
    # =========================================================

    def idade(self):
        """
        Cálculo clínico adaptativo.
        """

        if not self.birth_date:
            return "—"

        hoje = timezone.localdate()
        dias = (hoje - self.birth_date).days

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

    def address_formatada(self) -> str:
        parts = []
        for v in (
            self.address_street,
            self.address_number,
            self.address_neighborhood,
            self.address_city,
            self.address_province,
            self.address_postal_code,
            self.address_complement,
        ):
            txt = (v or "").strip()
            if txt:
                parts.append(txt)
        return ", ".join(parts)

    def save(self, *args, **kwargs):
        # Se o endereço estruturado for used, o "address" vira um resumo
        # consistente. Se não houver dados estruturados, preserva texto livre.
        endereco_estruturado_used = any(
            (v or "").strip()
            for v in (
                self.address_street,
                self.address_number,
                self.address_neighborhood,
                self.address_city,
                self.address_province,
                self.address_postal_code,
                self.address_complement,
            )
        )
        if endereco_estruturado_used:
            self.address = self.address_formatada()
        else:
            self.address = (self.address or "").strip()

        super().save(*args, **kwargs)

    # =========================================================
    # IDADE PARA MOTOR CLÍNICO (PRECISÃO ABSOLUTA)
    # =========================================================

    def idade_em_dias(self) -> int | None:

        if not self.birth_date:
            return None

        dias = (timezone.localdate() - self.birth_date).days

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
        return f"{self.custom_id} - {self.name}"
