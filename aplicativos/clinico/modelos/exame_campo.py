from django.core.exceptions import ValidationError as ve
from django.db import models as m

from frontend.billing.models.fields import (
    TipoField as tf,
    TipoResultado as tr,
    UnidadeField as uf,
)

from .nucleo import CoreModel as cm
from .exame import Exame as e


class ExameCampo(cm):
    exame = m.ForeignKey(
        e,
        on_delete=m.CASCADE,
        related_name="campos",
    )

    tipo = tf()
    unidade = uf()

    descricao = m.CharField(max_length=120, blank=True)

    valor_minimo = m.FloatField(null=True, blank=True)
    valor_maximo = m.FloatField(null=True, blank=True)
    critico_baixo = m.FloatField(null=True, blank=True)
    critico_alto = m.FloatField(null=True, blank=True)

    valores_normais = m.JSONField(null=True, blank=True)
    valores_alterados = m.JSONField(null=True, blank=True)
    valores_criticos = m.JSONField(null=True, blank=True)

    delta_check_ativo = m.BooleanField(default=True)
    detectar_tendencia = m.BooleanField(default=True)
    destacar_no_laudo = m.BooleanField(default=False)

    class Meta:
        verbose_name = "Campo do Exame"
        verbose_name_plural = "Campos do Exame"
        ordering = ["ordem", "nome_campo"]
        indexes = [
            m.Index(fields=["exame", "ordem"]),
            m.Index(fields=["exame", "nome_campo"]),
        ]

    def __str__(self):
        return f"{self.exame.nome} → {self.nome_campo}"

    def clean(self):
        tipo = self.tipo

        # =====================================================
        # NUMÉRICO
        # =====================================================
        if tipo == tr.NUMERICO:
            if self.valor_minimo is None and self.valor_maximo is None:
                raise ve(
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
                raise ve({"valor_minimo": "Não pode ser maior que o máximo."})

            if (
                self.critico_baixo is not None
                and self.valor_minimo is not None
                and self.critico_baixo > self.valor_minimo
            ):
                raise ve({"critico_baixo": "Deve ser menor que o mínimo."})

            if (
                self.critico_alto is not None
                and self.valor_maximo is not None
                and self.critico_alto < self.valor_maximo
            ):
                raise ve({"critico_alto": "Deve ser maior que o máximo."})

        # =====================================================
        # QUALITATIVO
        # =====================================================
        elif tipo == tr.QUALITATIVO:
            if not self.valores_normais:
                raise ve({"valores_normais": "Defina os valores considerados normais."})

        # =====================================================
        # SEMI-QUANTITATIVO
        # =====================================================
        elif tipo == tr.SEMIQUANTITATIVO:
            if any(
                [
                    self.valor_minimo,
                    self.valor_maximo,
                    self.valores_normais,
                    self.valores_alterados,
                    self.valores_criticos,
                ]
            ):
                raise ve("Campos semi-quantitativos não devem possuir referências clínicas.")

        # =====================================================
        # TEXTO LIVRE
        # =====================================================
        elif tipo == tr.TEXTO:
            if any(
                [
                    self.valor_minimo,
                    self.valor_maximo,
                    self.valores_normais,
                    self.valores_alterados,
                    self.valores_criticos,
                ]
            ):
                raise ve("Campos de texto livre não devem possuir referências clínicas.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
