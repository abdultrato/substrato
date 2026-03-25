from decimal import Decimal

from django.db import models

from core.models.base import NoNameCoreModel


class TenantConfiguration(NoNameCoreModel):
    prefix = "CFG"

    tenant = models.OneToOneField(
        "inquilinos.Tenant",
        db_column="tenant_id",
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

    # Consultas: acréscimo percentual aplicado quando a date for marcada como feriado.
    holiday_consultation_percentage_surcharge = models.DecimalField(
        db_column="holiday_consultation_percentage_surcharge",
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        db_table = "inquilinos_configuracaoinquilino"
        verbose_name = "Configuração do Inquilino"
        verbose_name_plural = "Configurações do Inquilino"

    def __str__(self) -> str:
        return f"Config {self.tenant_id}"
