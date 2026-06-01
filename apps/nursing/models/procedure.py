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

        # P0.4: CRÍTICO - Transação atômica com lock pessimista para evitar race conditions
        from django.db import transaction

        with transaction.atomic():
            # Lock pessimista: garante que nenhuma outra thread modifica a Procedure enquanto sincronizamos
            locked_procedure = (
                self.__class__.all_objects
                .select_for_update()
                .get(pk=self.pk)
            )

            # Busca items com lock também para evitar leitura suja
            items = list(
                locked_procedure.itens
                .select_for_update()
                .filter(deleted=False)
            )

            if not items:
                workflow_status = self.WorkflowStatus.REQUESTED
                billing_status = self.BillingStatus.PENDING
                billed_at = None
                executed_at = None
                completed_at = None
            else:
                # OTIMIZAÇÃO P1: Usar aggregate() em vez de loops em Python
                from django.db.models import Count, Max, Q, Case, When, Value
                from django.db.models.functions import Greatest

                agg_result = self.__class__._default_manager.filter(pk=self.pk).values_list('id').aggregate(
                    billed_count=Count('items', filter=Q(items__billed=True)),
                    total_items=Count('items'),
                    max_billed_at=Max('items__billed_at'),
                    max_executed_at=Max('items__executed_at'),
                    max_completed_at=Max('items__completed_at'),
                    pending_count=Count('items', filter=Q(items__execution_status='PENDING')),
                    executed_count=Count('items', filter=Q(items__execution_status='EXECUTED')),
                    completed_count=Count('items', filter=Q(items__execution_status='COMPLETED')),
                    not_completed_count=Count('items', filter=Q(items__execution_status='NOT_COMPLETED')),
                )[0] if items else None

                # Se não temos items, manter valores anteriores
                if not agg_result or agg_result['total_items'] == 0:
                    workflow_status = self.WorkflowStatus.REQUESTED
                    billing_status = self.BillingStatus.PENDING
                    billed_at = None
                    executed_at = None
                    completed_at = None
                else:
                    billed_count = agg_result['billed_count'] or 0
                    total_items = agg_result['total_items'] or 0

                    if billed_count == 0:
                        billing_status = self.BillingStatus.PENDING
                        billed_at = None
                    elif billed_count == total_items:
                        billing_status = self.BillingStatus.BILLED
                        billed_at = agg_result['max_billed_at'] or timezone.now()
                    else:
                        billing_status = self.BillingStatus.PARTIAL
                        billed_at = agg_result['max_billed_at']

                    # Determinar workflow status baseado na contagem agregada
                    pending_count = agg_result['pending_count'] or 0
                    executed_count = agg_result['executed_count'] or 0
                    completed_count = agg_result['completed_count'] or 0
                    not_completed_count = agg_result['not_completed_count'] or 0

                    if pending_count == total_items:
                        workflow_status = (
                            self.WorkflowStatus.BILLED if billing_status == self.BillingStatus.BILLED else self.WorkflowStatus.REQUESTED
                        )
                    elif executed_count == total_items:
                        workflow_status = self.WorkflowStatus.EXECUTED
                    elif completed_count == total_items:
                        workflow_status = self.WorkflowStatus.COMPLETED
                    elif not_completed_count == total_items:
                        workflow_status = self.WorkflowStatus.NOT_COMPLETED
                    else:
                        workflow_status = self.WorkflowStatus.PARTIAL

                    executed_at = agg_result['max_executed_at']
                    completed_at = agg_result['max_completed_at']

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

    @property
    def invoice(self):
        """
        Compatibilidade legado: retorna a fatura mais recente vinculada
        via campo legado `Invoice.procedure`.
        """
        return self.invoices_legacy.order_by("-created_at", "-id").first()
