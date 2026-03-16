from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import (
    F,
    Q,
)

from nucleo.constantes.genero import Genero
from nucleo.modelos.base import CoreModel


class ReferenciaClinica(CoreModel):
    """
    Define intervalos de referência laboratoriais.

    Pode variar por:
    • sexo
    • faixa etária
    • exame_campo

    Também define limites críticos clínicos.
    """

    prefixo = "REF"

    exame_campo = models.ForeignKey(
        "ExameCampo",
        on_delete=models.CASCADE,
        related_name="referencias",
    )

    sexo = models.CharField(
        max_length=10,
        choices=Genero.choices,
        null=True,
        blank=True,
        help_text="Se vazio, aplica-se a ambos os sexos.",
    )

    idade_minima_dias = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Idade mínima em dias.",
    )

    idade_maxima_dias = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Idade máxima em dias.",
    )

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

    class Meta:
        ordering = [
            "exame_campo",
            "sexo",
            "idade_minima_dias",
        ]

        indexes = [
            models.Index(fields=["exame_campo"]),
            models.Index(fields=["sexo"]),
            models.Index(fields=["idade_minima_dias", "idade_maxima_dias"]),
        ]

        constraints = [
            # faixa etária válida
            models.CheckConstraint(
                check=(
                    Q(idade_maxima_dias__gte=F("idade_minima_dias"))
                    | Q(idade_minima_dias__isnull=True)
                    | Q(idade_maxima_dias__isnull=True)
                ),
                name="ref_idade_intervalo_valido",
            ),
            # intervalo clínico válido
            models.CheckConstraint(
                check=(
                    Q(valor_maximo__gte=F("valor_minimo")) | Q(valor_minimo__isnull=True) | Q(valor_maximo__isnull=True)
                ),
                name="ref_valor_intervalo_valido",
            ),
            # intervalo crítico válido
            models.CheckConstraint(
                check=(
                    Q(critico_alto__gte=F("critico_baixo"))
                    | Q(critico_baixo__isnull=True)
                    | Q(critico_alto__isnull=True)
                ),
                name="ref_critico_intervalo_valido",
            ),
        ]

    # =====================================================
    # VALIDAÇÕES DE DOMÍNIO
    # =====================================================

    def clean(self):
        if self.valor_minimo is not None and self.valor_maximo is not None and self.valor_minimo > self.valor_maximo:
            raise ValidationError("Valor mínimo não pode ser maior que valor máximo.")

        if self.critico_baixo is not None and self.critico_alto is not None and self.critico_baixo > self.critico_alto:
            raise ValidationError("Limite crítico baixo não pode ser maior que crítico alto.")

        if (
            self.idade_minima_dias is not None
            and self.idade_maxima_dias is not None
            and self.idade_minima_dias > self.idade_maxima_dias
        ):
            raise ValidationError("Idade mínima não pode ser maior que idade máxima.")

    # =====================================================
    # REPRESENTAÇÃO
    # =====================================================

    def __str__(self):
        sexo = self.sexo or "Todos"

        if self.valor_minimo is not None and self.valor_maximo is not None:
            intervalo = f"{self.valor_minimo} - {self.valor_maximo}"
        else:
            intervalo = "intervalo aberto"

        return f"{self.exame_campo.nome} ({sexo}) {intervalo}"
