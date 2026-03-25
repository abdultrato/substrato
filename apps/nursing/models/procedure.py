from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import DecimalField, F, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from core.models.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class Procedure(NoNameCoreModel):
    prefix = "PROC"

    patient = models.ForeignKey(

        "clinico.Patient",

        db_column="paciente_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="procedures_enfermagem",
        db_index=True,
    )
    professional = models.ForeignKey(
        User,
        db_column="profissional_id",
        verbose_name="Profissional",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedures_realizados",
    )
    performed_date = models.DateTimeField("Data de realização", 
        db_column="data_realizacao",
         default=timezone.now, db_index=True)
    notes = models.TextField("Observações", 
        db_column="observacoes",
         blank=True, default="")
    services_subtotal = models.DecimalField(
        "Subtotal (serviços)",
        db_column="subtotal_servicos",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    materials_subtotal = models.DecimalField(
        "Subtotal (materiais)",
        db_column="subtotal_materiais",
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
        db_table = "enfermagem_procedimento"
        ordering = ["-performed_date", "-created_at"]
        verbose_name = "Procedimento"
        verbose_name_plural = "Procedimentos"
        indexes = [
            models.Index(fields=["tenant", "patient"]),
            models.Index(fields=["performed_date"]),
        ]

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.patient_id:
            self.tenant_id = self.patient.tenant_id
        super().save(*args, **kwargs)

    def recalculate_totals(self):
        if not self.pk:
            return

        services_subtotal = self.itens.filter(performed=True).aggregate(
            total=Coalesce(
                Sum(
                    F("quantity") * F("value__unit_price"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        materials_subtotal = self.materiais.aggregate(
            total=Coalesce(
                Sum(
                    F("quantity") * F("value__unit_cost"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        total = services_subtotal + materials_subtotal

        self.__class__.all_objects.filter(pk=self.pk).update(
            services_subtotal=services_subtotal,
            materials_subtotal=materials_subtotal,
            total=total,
        )

        self.services_subtotal = services_subtotal
        self.materials_subtotal = materials_subtotal
        self.total = total

    def __str__(self):
        return f"{self.custom_id} - {self.patient.name}"

