from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from nucleo.modelos.base import CoreModel
from infrastrutura.orm.fields.unidade_field import UnidadeField
from infrastrutura.orm.fields.tipo_resultado_field import TipoResultadoField
from nucleo.constantes.laboratorio.tipo_resultado import TipoResultado

from .exame import Exame


class ExameCampo(CoreModel):
    """
    Define os campos individuais de um exame.
    """

    exame = models.ForeignKey(
        Exame,
        on_delete=models.CASCADE,
        related_name="campos",
        db_index=True,
    )

    tipo = TipoResultadoField(db_index=True)
    unidade = UnidadeField()

    descricao = models.CharField(max_length=120, blank=True)

    # =========================
    # REFERÊNCIAS NUMÉRICAS
    # =========================

    valor_minimo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    valor_maximo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    critico_baixo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    critico_alto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    # =========================
    # REFERÊNCIAS QUALITATIVAS
    # =========================

    valores_normais = models.JSONField(null=True, blank=True)
    valores_alterados = models.JSONField(null=True, blank=True)
    valores_criticos = models.JSONField(null=True, blank=True)

    # =========================
    # REGRAS CLÍNICAS
    # =========================

    delta_check_ativo = models.BooleanField(default=True)
    detectar_tendencia = models.BooleanField(default=True)
    destacar_no_laudo = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Campo do Exame"
        verbose_name_plural = "Campos do Exame"

        ordering = ["ordem", "nome"]

        indexes = [
            # Busca principal
            models.Index(fields=["exame"]),
            models.Index(fields=["tipo"]),
            models.Index(fields=["exame", "ativo", "deletado"]),
        ]

        constraints = [
            # Garante unicidade lógica dentro do exame
            models.UniqueConstraint(
                fields=["exame", "nome"],
                condition=Q(deletado=False),
                name="unique_nome_por_exame_ativo",
            ),
        ]

    def __str__(self):
        return f"{self.exame.nome} → {self.nome}"

    # =========================================================
    # VALIDAÇÃO CLÍNICA
    # =========================================================

    def clean(self):
        super().clean()

        tipo = self.tipo

        if tipo == TipoResultado.NUMERICO:

            if self.valor_minimo is None and self.valor_maximo is None:
                raise ValidationError(
                    {
                        "valor_minimo": "Defina valores de referência.",
                        "valor_maximo": "Defina valores de referência.",
                    }
                )

            if (
                self.valor_minimo is not None
                and self.valor_maximo is not None
                and self.valor_minimo > self.valor_maximo
            ):
                raise ValidationError(
                    {"valor_minimo": "Não pode ser maior que o máximo."}
                )

            if (
                self.critico_baixo is not None
                and self.valor_minimo is not None
                and self.critico_baixo > self.valor_minimo
            ):
                raise ValidationError(
                    {"critico_baixo": "Deve ser menor que o mínimo."}
                )

            if (
                self.critico_alto is not None
                and self.valor_maximo is not None
                and self.critico_alto < self.valor_maximo
            ):
                raise ValidationError(
                    {"critico_alto": "Deve ser maior que o máximo."}
                )

        elif tipo == TipoResultado.QUALITATIVO:

            if not self.valores_normais:
                raise ValidationError(
                    {"valores_normais": "Defina os valores considerados normais."}
                )

        elif tipo in (
            TipoResultado.SEMIQUANTITATIVO,
            TipoResultado.TEXTO,
        ):

            if any(
                [
                    self.valor_minimo,
                    self.valor_maximo,
                    self.valores_normais,
                    self.valores_alterados,
                    self.valores_criticos,
                ]
            ):
                raise ValidationError(
                    "Este tipo não deve possuir referências clínicas."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
