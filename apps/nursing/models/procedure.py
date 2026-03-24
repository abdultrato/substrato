from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import DecimalField, F, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from core.models.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class Procedure(NoNameCoreModel):
    prefixo = "PROC"

    paciente = models.ForeignKey(
        "clinico.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="procedimentos_enfermagem",
        db_index=True,
    )
    profissional = models.ForeignKey(
        User,
        verbose_name="Profissional",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedimentos_realizados",
    )
    data_realizacao = models.DateTimeField("Data de realização", default=timezone.now, db_index=True)
    observacoes = models.TextField("Observações", blank=True, default="")
    subtotal_servicos = models.DecimalField(
        "Subtotal (serviços)",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    subtotal_materiais = models.DecimalField(
        "Subtotal (materiais)",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    total = models.DecimalField(
        "Total",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        ordering = ["-data_realizacao", "-criado_em"]
        verbose_name = "Procedimento"
        verbose_name_plural = "Procedimentos"
        indexes = [
            models.Index(fields=["inquilino", "paciente"]),
            models.Index(fields=["data_realizacao"]),
        ]

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id
        super().save(*args, **kwargs)

    def recalculate_totals(self):
        if not self.pk:
            return

        subtotal_servicos = self.itens.filter(realizado=True).aggregate(
            total=Coalesce(
                Sum(
                    F("quantidade") * F("valor__preco_unitario"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        subtotal_materiais = self.materiais.aggregate(
            total=Coalesce(
                Sum(
                    F("quantidade") * F("valor__custo_unitario"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        total = subtotal_servicos + subtotal_materiais

        self.__class__.all_objects.filter(pk=self.pk).update(
            subtotal_servicos=subtotal_servicos,
            subtotal_materiais=subtotal_materiais,
            total=total,
        )

        self.subtotal_servicos = subtotal_servicos
        self.subtotal_materiais = subtotal_materiais
        self.total = total

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"


Procedure.recalcular_totais = Procedure.recalculate_totals
