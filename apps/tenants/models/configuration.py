from decimal import Decimal

from django.db import models

from core.models.base import NoNameCoreModel


class TenantConfiguration(NoNameCoreModel):
    prefix = "CFG"

    tenant = models.OneToOneField(
        "inquilinos.Tenant",
        db_column="tenant_id",
        verbose_name="Cliente",
        on_delete=models.CASCADE,
        related_name="configuracao",
        db_index=True,
    )

    time_zone = models.CharField(

        db_column="time_zone",

        max_length=80, default="Africa/Maputo")
    currency = models.CharField(
        db_column="currency",
        max_length=10, default="MZN")
    language = models.CharField(
        db_column="language",
        max_length=10, default="pt")

    allows_multi_unit = models.BooleanField(

        db_column="allows_multi_unit",

        default=False)
    user_limit = models.PositiveIntegerField(
        db_column="user_limit",
        default=1)

    # Consultas: acréscimo percentual aplicado quando a data for marcada como feriado.
    holiday_consultation_percentage_surcharge = models.DecimalField(
        db_column="holiday_consultation_percentage_surcharge",
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    # ── Identidade fiscal/legal da entidade (impressa em faturas e documentos) ──
    legal_name = models.CharField(
        db_column="legal_name",
        verbose_name="Designação legal",
        max_length=200,
        blank=True,
        default="",
        help_text="Nome legal da entidade tal como registado.",
    )
    nuit = models.CharField(
        db_column="nuit",
        verbose_name="NUIT",
        max_length=30,
        blank=True,
        default="",
    )
    fiscal_address = models.TextField(
        db_column="fiscal_address",
        verbose_name="Morada fiscal completa",
        blank=True,
        default="",
    )
    fiscal_phone = models.CharField(
        db_column="fiscal_phone",
        verbose_name="Telefone",
        max_length=40,
        blank=True,
        default="",
    )
    fiscal_email = models.CharField(
        db_column="fiscal_email",
        verbose_name="E-mail",
        max_length=120,
        blank=True,
        default="",
    )
    license_number = models.CharField(
        db_column="license_number",
        verbose_name="Alvará / Licença",
        max_length=80,
        blank=True,
        default="",
    )
    health_unit_registration = models.CharField(
        db_column="health_unit_registration",
        verbose_name="Registo da unidade sanitária/laboratório",
        max_length=80,
        blank=True,
        default="",
    )
    technical_manager = models.CharField(
        db_column="technical_manager",
        verbose_name="Responsável técnico",
        max_length=160,
        blank=True,
        default="",
    )

    class Meta:
        db_table = "inquilinos_configuracaoinquilino"
        verbose_name = "Configuração do Cliente"
        verbose_name_plural = "Configurações do Cliente"

    def __str__(self) -> str:
        return f"Config {self.tenant_id}"
