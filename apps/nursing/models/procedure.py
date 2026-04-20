from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import DecimalField, F, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from core.models.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class Procedure(NoNameCoreModel):
    """Procedimento de enfermagem com itens de serviço e materiais."""
    prefix = "PROC"

    class WorkflowStatus(models.TextChoices):
        REQUESTED = "REQ", "Marcado"
        BILLED = "BIL", "Faturado"
        EXECUTED = "EXE", "Executado"
        COMPLETED = "CON", "Concluído"
        NOT_COMPLETED = "NCO", "Não concluído"
        PARTIAL = "PAR", "Parcial"

    class BillingStatus(models.TextChoices):
        PENDING = "PEN", "Pendente"
        PARTIAL = "PAR", "Parcial"
        BILLED = "BIL", "Faturado"

    patient = models.ForeignKey(

        "clinical.Patient",

        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="procedures_enfermagem",
        db_index=True,
    )
    professional = models.ManyToManyField(
        User,
        verbose_name="Profissionais",
        blank=True,
        related_name="procedures_realizados",
    )
    performed_date = models.DateTimeField("Data de realização",
        db_column="performed_date",
         default=timezone.now, db_index=True)
    notes = models.TextField("Observações",
        db_column="notes",
         blank=True, default="")
    workflow_status = models.CharField(
        db_column="workflow_status",
        max_length=3,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.REQUESTED,
        db_index=True,
    )
    billing_status = models.CharField(
        db_column="billing_status",
        max_length=3,
        choices=BillingStatus.choices,
        default=BillingStatus.PENDING,
        db_index=True,
    )
    billed_at = models.DateTimeField(
        db_column="billed_at",
        null=True,
        blank=True,
    )
    executed_at = models.DateTimeField(
        db_column="executed_at",
        null=True,
        blank=True,
    )
    completed_at = models.DateTimeField(
        db_column="completed_at",
        null=True,
        blank=True,
    )
    services_subtotal = models.DecimalField(
        "Subtotal (serviços)",
        db_column="services_subtotal",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    materials_subtotal = models.DecimalField(
        "Subtotal (materiais)",
        db_column="materials_subtotal",
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
    selected_materials = models.ManyToManyField(
        "farmacia.Product",
        blank=True,
        verbose_name="Materiais selecionados",
        related_name="procedures_selected",
    )
    selected_catalogs = models.ManyToManyField(
        "enfermagem.ProcedureCatalog",
        blank=True,
        verbose_name="Procedimentos do catálogo",
        related_name="procedures_selected",
    )

    class Meta:
        db_table = "enfermagem_procedimento"
        ordering = ["-performed_date", "-created_at"]
        verbose_name = "Procedimento"
        verbose_name_plural = "Procedimentos"
        indexes = [
            models.Index(fields=["tenant", "patient"]),
            models.Index(fields=["performed_date"]),
            models.Index(fields=["workflow_status"]),
            models.Index(fields=["billing_status"]),
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

    def sync_status_from_items(self):
        if not self.pk:
            return

        items = list(self.itens.filter(deleted=False))
        if not items:
            workflow_status = self.WorkflowStatus.REQUESTED
            billing_status = self.BillingStatus.PENDING
            billed_at = None
            executed_at = None
            completed_at = None
        else:
            billed_count = sum(1 for item in items if item.billed)
            if billed_count == 0:
                billing_status = self.BillingStatus.PENDING
                billed_at = None
            elif billed_count == len(items):
                billing_status = self.BillingStatus.BILLED
                billed_dates = [item.billed_at for item in items if item.billed_at]
                billed_at = max(billed_dates) if billed_dates else timezone.now()
            else:
                billing_status = self.BillingStatus.PARTIAL
                billed_dates = [item.billed_at for item in items if item.billed_at]
                billed_at = max(billed_dates) if billed_dates else None

            statuses = {item.execution_status for item in items}
            execution_status = items[0].ExecutionStatus
            if statuses == {execution_status.PENDING}:
                workflow_status = (
                    self.WorkflowStatus.BILLED if billing_status == self.BillingStatus.BILLED else self.WorkflowStatus.REQUESTED
                )
            elif statuses == {execution_status.EXECUTED}:
                workflow_status = self.WorkflowStatus.EXECUTED
            elif statuses == {execution_status.COMPLETED}:
                workflow_status = self.WorkflowStatus.COMPLETED
            elif statuses == {execution_status.NOT_COMPLETED}:
                workflow_status = self.WorkflowStatus.NOT_COMPLETED
            else:
                workflow_status = self.WorkflowStatus.PARTIAL

            executed_dates = [
                dt
                for dt in [item.executed_at for item in items]
                if dt is not None
            ]
            completed_dates = [
                dt
                for dt in [item.completed_at for item in items]
                if dt is not None
            ]
            executed_at = max(executed_dates) if executed_dates else None
            completed_at = max(completed_dates) if completed_dates else None

        self.__class__.all_objects.filter(pk=self.pk).update(
            workflow_status=workflow_status,
            billing_status=billing_status,
            billed_at=billed_at,
            executed_at=executed_at,
            completed_at=completed_at,
        )
        self.workflow_status = workflow_status
        self.billing_status = billing_status
        self.billed_at = billed_at
        self.executed_at = executed_at
        self.completed_at = completed_at

    def __str__(self):
        return f"{self.custom_id} - {self.patient.name}"
