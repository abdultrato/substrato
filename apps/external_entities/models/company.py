"""Entidades externas/internas como empregadores ou parceiros."""

from django.db import models

from core.models.base import CoreModel


class Company(CoreModel):
    """
    Empresas/entidades externas (ex.: empregadores para medicina ocupacional,
    parceiros subcontratados, etc.).
    """

    prefix = "EMP"  # Prefixo para IDs amigáveis usados em custom_id

    nuit = models.CharField(  # Número Único de Identificação Tributária
        verbose_name="NUIT",
        max_length=30,
        blank=True,
        null=True,
        db_index=True,
    )

    headquarters_address = models.CharField(  # Endereço principal/sede
        db_column="headquarters_address",
        verbose_name="Local / Sede",
        max_length=255,
        blank=True,
        null=True,
    )

    contacts = models.CharField(  # Ponto de contacto dentro da empresa
        db_column="contacts",
        verbose_name="Contactos",
        max_length=255,
        blank=True,
        null=True,
        help_text="Pessoa, departamento ou referência de contacto.",
    )

    email = models.EmailField(  # E-mail institucional ou do contacto
        verbose_name="E-mail",
        blank=True,
        null=True,
    )

    phone1 = models.CharField(  # Telefone principal
        db_column="phone1",
        verbose_name="Telefone",
        max_length=30,
        blank=True,
        null=True,
    )

    phone2 = models.CharField(  # Telefone alternativo para contingência
        db_column="phone2",
        verbose_name="Telefone (alternativo)",
        max_length=30,
        blank=True,
        null=True,
    )

    nib = models.CharField(  # Dados bancários para faturação/pagamentos
        verbose_name="NIB / Conta bancária",
        max_length=60,
        blank=True,
        null=True,
    )

    active = models.BooleanField(  # Flag de atividade para soft-disable
        db_column="active",
        verbose_name="Ativo",
        default=True,
        db_index=True,
    )

    notes = models.TextField(  # Observações internas livres
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        null=True,
    )

    class Meta:
        db_table = "entidades_empresa"  # Nome explícito para manter legado
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"
        ordering = ["name"]  # Ordenação padrão em listagens
        indexes = [  # Índices usados em buscas frequentes
            models.Index(fields=["tenant"]),
            models.Index(fields=["name"]),
            models.Index(fields=["nuit"]),
            models.Index(fields=["active"]),
        ]

    def __str__(self) -> str:
        return self.name or f"Empresa {self.pk}"  # Fallback legível no admin
