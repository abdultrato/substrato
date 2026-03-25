from django.db import models

from core.models.base import CoreModel


class Company(CoreModel):
    """
    Empresas/entidades externas (ex.: empregadores para medicina ocupacional,
    parceiros subcontratados, etc.).
    """

    prefix = "EMP"

    nuit = models.CharField(
        verbose_name="NUIT",
        max_length=30,
        blank=True,
        null=True,
        db_index=True,
    )

    headquarters_address = models.CharField(

        db_column="endereco_sede",

        verbose_name="Local / Sede",
        max_length=255,
        blank=True,
        null=True,
    )

    contacts = models.CharField(

        db_column="contactos",

        verbose_name="Contactos",
        max_length=255,
        blank=True,
        null=True,
        help_text="Pessoa, department ou referência de contact.",
    )

    email = models.EmailField(
        verbose_name="E-mail",
        blank=True,
        null=True,
    )

    phone1 = models.CharField(

        db_column="telefone1",

        verbose_name="Telefone",
        max_length=30,
        blank=True,
        null=True,
    )

    phone2 = models.CharField(

        db_column="telefone2",

        verbose_name="Telefone (alternativo)",
        max_length=30,
        blank=True,
        null=True,
    )

    nib = models.CharField(
        verbose_name="NIB / Conta bancária",
        max_length=60,
        blank=True,
        null=True,
    )

    active = models.BooleanField(

        db_column="ativo",

        verbose_name="Ativo",
        default=True,
        db_index=True,
    )

    notes = models.TextField(

        db_column="observacoes",

        verbose_name="Observações",
        blank=True,
        null=True,
    )

    class Meta:
        db_table = "entidades_empresa"
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant"]),
            models.Index(fields=["name"]),
            models.Index(fields=["nuit"]),
            models.Index(fields=["active"]),
        ]

    def __str__(self) -> str:
        return self.name or f"Empresa {self.pk}"
