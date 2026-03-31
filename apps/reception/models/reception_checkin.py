from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class ReceptionCheckin(NoNameCoreModel):
    """Check-in/triagem do paciente na recepção (fila e status do atendimento)."""
    prefix = "CHK"

    class Priority(models.TextChoices):
        URGENT = "URG", "Urgente"
        PREFERRED = "PREF", "Preferencial"
        NORMAL = "NOR", "Normal"

    class Status(models.TextChoices):
        WAITING = "AGUARD", "Aguardando"
        IN_CARE = "ATEND", "Em atendimento"
        REQUEST_CREATED = "REQ", "Requisição criada"
        INVOICE_LINKED = "FAT", "Fatura vinculada"
        COMPLETED = "CONC", "Concluído"
        CANCELED = "CANC", "Cancelado"

    patient = models.ForeignKey(

        "clinical.Patient",

        db_column="patient_id",
        on_delete=models.PROTECT,
        related_name="checkins",
        db_index=True,
    )

    request = models.OneToOneField(

        "clinical.LabRequest",

        db_column="request_id",
        on_delete=models.PROTECT,
        related_name="checkin",
        null=True,
        blank=True,
    )

    invoice = models.OneToOneField(

        "faturamento.Invoice",

        db_column="invoice_id",
        on_delete=models.PROTECT,
        related_name="checkin",
        null=True,
        blank=True,
    )

    attendant = models.ForeignKey(

        "identidade.User",

        db_column="attendant_id",
        on_delete=models.SET_NULL,
        related_name="checkins_recepcao",
        null=True,
        blank=True,
        db_index=True,
    )

    priority = models.CharField(

        db_column="priority",

        max_length=5,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )
    status = models.CharField(
        db_column="status",
        max_length=6,
        choices=Status.choices,
        default=Status.WAITING,
        db_index=True,
    )

    reason = models.CharField(

        db_column="reason",

        max_length=255, blank=True, default="")
    notes = models.TextField(
        db_column="notes",
        blank=True, default="")

    arrived_at = models.DateTimeField(

        db_column="arrived_at",

        default=timezone.now, db_index=True)
    called_at = models.DateTimeField(
        db_column="called_at",
        null=True, blank=True)
    completed_at = models.DateTimeField(
        db_column="completed_at",
        null=True, blank=True)

    class Meta:
        db_table = "recepcao_checkinrecepcao"
        verbose_name = "Check-in"
        verbose_name_plural = "Check-ins"
        ordering = ["-arrived_at"]
        indexes = [
            models.Index(fields=["tenant", "arrived_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "priority"]),
        ]

    # =====================================================
    # STATE MACHINE (simples)
    # =====================================================

    def start_care(self, attendant=None):
        if self.status in {self.Status.COMPLETED, self.Status.CANCELED}:
            raise ValidationError("Check-in já foi finalized.")

        if attendant is not None:
            self.attendant = attendant

        self.status = self.Status.IN_CARE
        if not self.called_at:
            self.called_at = timezone.now()

        self.save(update_fields=["attendant", "status", "called_at"])

    def register_request(self, request):
        if self.request_id:
            return
        self.request = request
        self.status = self.Status.REQUEST_CREATED
        self.save(update_fields=["request", "status"])

    def register_invoice(self, invoice):
        if self.invoice_id:
            return
        self.invoice = invoice
        self.status = self.Status.INVOICE_LINKED
        self.save(update_fields=["invoice", "status"])

    def complete(self):
        if self.status == self.Status.CANCELED:
            raise ValidationError("Check-in cancelado não pode ser concluído.")
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])

    def cancel(self):
        if self.status == self.Status.COMPLETED:
            raise ValidationError("Check-in concluído não pode ser cancelado.")
        self.status = self.Status.CANCELED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])

    def __str__(self) -> str:
        return self.custom_id or f"Checkin {self.pk}"
