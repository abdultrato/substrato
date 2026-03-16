from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import CoreModel


class AgregadoFamiliar(CoreModel):
    """
    Agregado familiar que vive com o funcionário (dependente).
    """

    prefixo = "AGF"

    class Parentesco(models.TextChoices):
        CONJUGE = "CONJUGE", "Cônjuge"
        FILHO = "FILHO", "Filho(a)"
        PAI = "PAI", "Pai/Mãe"
        IRMAO = "IRMAO", "Irmão(ã)"
        OUTRO = "OUTRO", "Outro"

    funcionario = models.ForeignKey(
        "recursos_humanos.Funcionario",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="agregados_familiares",
        db_index=True,
    )

    parentesco = models.CharField(
        verbose_name="Grau de parentesco",
        max_length=20,
        choices=Parentesco.choices,
        default=Parentesco.OUTRO,
        db_index=True,
    )

    data_nascimento = models.DateField(
        verbose_name="Data de nascimento",
        null=True,
        blank=True,
    )

    telefone = models.CharField(
        verbose_name="Telefone",
        max_length=30,
        blank=True,
        default="",
    )

    vive_com_funcionario = models.BooleanField(
        verbose_name="Vive com o funcionário",
        default=True,
        db_index=True,
    )

    observacoes = models.TextField(
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        verbose_name = "Agregado Familiar"
        verbose_name_plural = "Agregados Familiares"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino", "funcionario"]),
            models.Index(fields=["inquilino", "parentesco"]),
        ]

    def clean(self):
        super().clean()

        if self.funcionario_id and self.inquilino_id and self.funcionario.inquilino_id != self.inquilino_id:
            raise ValidationError(
                {"funcionario": "Funcionário e agregado familiar devem pertencer ao mesmo inquilino."}
            )

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.funcionario_id:
            self.inquilino_id = self.funcionario.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.nome} ({self.parentesco})".strip()
