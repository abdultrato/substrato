from django.db import models

from core.models.base import CoreModel


class Company(CoreModel):
    """
    Empresas/entidades externas (ex.: empregadores para medicina ocupacional,
    parceiros subcontratados, etc.).
    """

    prefixo = "EMP"

    nuit = models.CharField(
        verbose_name="NUIT",
        max_length=30,
        blank=True,
        null=True,
        db_index=True,
    )

    endereco_sede = models.CharField(
        verbose_name="Local / Sede",
        max_length=255,
        blank=True,
        null=True,
    )

    contactos = models.CharField(
        verbose_name="Contactos",
        max_length=255,
        blank=True,
        null=True,
        help_text="Pessoa, departamento ou referência de contacto.",
    )

    email = models.EmailField(
        verbose_name="E-mail",
        blank=True,
        null=True,
    )

    telefone1 = models.CharField(
        verbose_name="Telefone",
        max_length=30,
        blank=True,
        null=True,
    )

    telefone2 = models.CharField(
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

    ativo = models.BooleanField(
        verbose_name="Ativo",
        default=True,
        db_index=True,
    )

    observacoes = models.TextField(
        verbose_name="Observações",
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino"]),
            models.Index(fields=["nome"]),
            models.Index(fields=["nuit"]),
            models.Index(fields=["ativo"]),
        ]

    def __str__(self) -> str:
        return self.nome or f"Empresa {self.pk}"
