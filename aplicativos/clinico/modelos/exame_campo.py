from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import ModeloBase
from nucleo.mixins.modelo.nome import NomeMixin
from nucleo.mixins.modelo.ordem import OrdemMixin

from infraestrutura.orm.fields.unidade_field import UnidadeField
from infraestrutura.orm.fields.tipo_resultado_field import TipoResultadoField

from nucleo.constantes.laboratorio.tipo_resultado import TipoResultado

from .exame import Exame


class ExameCampo(ModeloBase, NomeMixin, OrdemMixin):
    """
    Define os campos individuais de um exame.
    """

    exame = models.ForeignKey(
        Exame,
        on_delete=models.CASCADE,
        related_name="campos",
    )

    tipo = TipoResultadoField()
    unidade = UnidadeField()

    descricao = models.CharField(max_length=120, blank=True)

    # Referências numéricas
    valor_minimo = models.FloatField(null=True, blank=True)
    valor_maximo = models.FloatField(null=True, blank=True)
    critico_baixo = models.FloatField(null=True, blank=True)
    critico_alto = models.FloatField(null=True, blank=True)

    # Referências qualitativas
    valores_normais = models.JSONField(null=True, blank=True)
    valores_alterados = models.JSONField(null=True, blank=True)
    valores_criticos = models.JSONField(null=True, blank=True)

    # Regras clínicas
    delta_check_ativo = models.BooleanField(default=True)
    detectar_tendencia = models.BooleanField(default=True)
    destacar_no_laudo = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Campo do Exame"
        verbose_name_plural = "Campos do Exame"
        ordering = ["ordem", "nome"]
        indexes = [
            models.Index(fields=["exame", "ordem"]),
            models.Index(fields=["exame", "nome"]),
        ]

    def __str__(self):
        return f"{self.exame.nome} → {self.nome}"

    def clean(self):
        tipo = self.tipo

        # =========================
        # NUMÉRICO
        # =========================
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
                raise ValidationError({"critico_baixo": "Deve ser menor que o mínimo."})

            if (
                self.critico_alto is not None
                and self.valor_maximo is not None
                and self.critico_alto < self.valor_maximo
            ):
                raise ValidationError({"critico_alto": "Deve ser maior que o máximo."})

        # =========================
        # QUALITATIVO
        # =========================
        elif tipo == TipoResultado.QUALITATIVO:
            if not self.valores_normais:
                raise ValidationError(
                    {"valores_normais": "Defina os valores considerados normais."}
                )

        # =========================
        # SEMI-QUANTITATIVO
        # =========================
        elif tipo == TipoResultado.SEMIQUANTITATIVO:
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
                    "Campos semi-quantitativos não devem possuir referências clínicas."
                )

        # =========================
        # TEXTO LIVRE
        # =========================
        elif tipo == TipoResultado.TEXTO:
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
                    "Campos de texto livre não devem possuir referências clínicas."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
