from django.db import models
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _
from nucleo.modelos.base import InqCoreModel


class ConfiguracaoInquilino(InqCoreModel):
    """
    Configurações globais específicas de cada tenant.

    ✔ 1:1 com Inquilino
    ✔ Isolado por tenant
    ✔ Preparado para expansão futura
    """

    prefixo = "CINQ"

    inquilino = models.OneToOneField(
        "inquilinos.Inquilino",
        on_delete=models.CASCADE,
        related_name="configuracao",
    )

    fuso_horario = models.CharField(
        max_length=50,
        default="Africa/Maputo",
        help_text=_("Timezone padrão do tenant."),
    )

    moeda = models.CharField(
        max_length=3,
        default="MZN",
        validators=[MinLengthValidator(3)],
        help_text=_("Código ISO 4217 da moeda."),
    )

    idioma = models.CharField(
        max_length=5,
        default="pt",
        help_text=_("Código ISO 639-1 do idioma."),
    )

    permite_multi_unidade = models.BooleanField(
        default=False,
        help_text=_("Indica se o tenant possui múltiplas unidades operacionais."),
    )

    limite_usuarios = models.PositiveIntegerField(
        default=10,
        help_text=_("Limite máximo de usuários ativos."),
    )

    class Meta:
        verbose_name = _("Configuração do Inquilino")
        verbose_name_plural = _("Configurações dos Inquilinos")
        indexes = [
            models.Index(fields=["inquilino"]),
        ]

    def __str__(self):
        return f"Configuração de {self.inquilino.nome}"
