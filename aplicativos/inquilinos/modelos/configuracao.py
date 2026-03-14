from decimal import Decimal

from django.db import models

from nucleo.modelos.base import NoNameCoreModel


class ConfiguracaoInquilino(NoNameCoreModel):
    prefixo = "CFG"

    inquilino = models.OneToOneField(
        "inquilinos.Inquilino",
        on_delete=models.CASCADE,
        related_name="configuracao",
        db_index=True,
    )

    fuso_horario = models.CharField(max_length=80, default="Africa/Maputo")
    moeda = models.CharField(max_length=10, default="MZN")
    idioma = models.CharField(max_length=10, default="pt")

    permite_multi_unidade = models.BooleanField(default=False)
    limite_usuarios = models.PositiveIntegerField(default=1)

    # Consultas: acréscimo percentual aplicado quando a data for marcada como feriado.
    acrescimo_percentual_consulta_feriado = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        verbose_name = "Configuração do Inquilino"
        verbose_name_plural = "Configurações do Inquilino"

    def __str__(self) -> str:
        return f"Config {self.inquilino_id}"
