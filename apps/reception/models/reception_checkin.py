from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class ReceptionCheckin(NoNameCoreModel):
    prefix = "CHK"

    class Priority(models.TextChoices):
        URGENTE = "URG", "Urgente"
        PREFERENCIAL = "PREF", "Preferencial"
        NORMAL = "NOR", "Normal"

    class Status(models.TextChoices):
        AGUARDANDO = "AGUARD", "Aguardando"
        EM_ATENDIMENTO = "ATEND", "Em atendimento"
        REQUISICAO_CRIADA = "REQ", "Requisição criada"
        FATURA_VINCULADA = "FAT", "Fatura vinculada"
        CONCLUIDO = "CONC", "Concluído"
        CANCELADO = "CANC", "Cancelado"

    Prioridade = Priority
    Estado = Status

    patient = models.ForeignKey(

        "clinico.Patient",

        db_column="paciente_id",
        on_delete=models.PROTECT,
        related_name="checkins",
        db_index=True,
    )

    request = models.OneToOneField(

        "clinico.LabRequest",

        db_column="requisicao_id",
        on_delete=models.PROTECT,
        related_name="checkin",
        null=True,
        blank=True,
    )

    invoice = models.OneToOneField(

        "faturamento.Invoice",

        db_column="fatura_id",
        on_delete=models.PROTECT,
        related_name="checkin",
        null=True,
        blank=True,
    )

    attendant = models.ForeignKey(

        "identidade.User",

        db_column="atendente_id",
        on_delete=models.SET_NULL,
        related_name="checkins_recepcao",
        null=True,
        blank=True,
        db_index=True,
    )

    priority = models.CharField(

        db_column="prioridade",

        max_length=5,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )
    status = models.CharField(
        db_column="estado",
        max_length=6,
        choices=Status.choices,
        default=Status.AGUARDANDO,
        db_index=True,
    )

    reason = models.CharField(

        db_column="motivo",

        max_length=255, blank=True, default="")
    notes = models.TextField(
        db_column="observacoes",
        blank=True, default="")

    arrived_at = models.DateTimeField(

        db_column="chegou_em",

        default=timezone.now, db_index=True)
    called_at = models.DateTimeField(
        db_column="chamado_em",
        null=True, blank=True)
    completed_at = models.DateTimeField(
        db_column="concluido_em",
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
        if self.status in {self.Status.CONCLUIDO, self.Status.CANCELADO}:
            raise ValidationError("Check-in já foi finalized.")

        if attendant is not None:
            self.attendant = attendant

        self.status = self.Status.EM_ATENDIMENTO
        if not self.called_at:
            self.called_at = timezone.now()

        self.save(update_fields=["attendant", "status", "called_at"])

    def register_request(self, request):
        if self.request_id:
            return
        self.request = request
        self.status = self.Status.REQUISICAO_CRIADA
        self.save(update_fields=["request", "status"])

    def register_invoice(self, invoice):
        if self.invoice_id:
            return
        self.invoice = invoice
        self.status = self.Status.FATURA_VINCULADA
        self.save(update_fields=["invoice", "status"])

    def concluir(self):
        if self.status == self.Status.CANCELADO:
            raise ValidationError("Check-in cancelado não pode ser concluído.")
        self.status = self.Status.CONCLUIDO
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])

    def cancelar(self):
        if self.status == self.Status.CONCLUIDO:
            raise ValidationError("Check-in concluído não pode ser cancelado.")
        self.status = self.Status.CANCELADO
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at"])

    def __str__(self) -> str:
        return self.custom_id or f"Checkin {self.pk}"


ReceptionCheckin.iniciar_atendimento = ReceptionCheckin.start_care
ReceptionCheckin.registrar_request = ReceptionCheckin.register_request
ReceptionCheckin.registrar_invoice = ReceptionCheckin.register_invoice
CheckinRecepcao = ReceptionCheckin
