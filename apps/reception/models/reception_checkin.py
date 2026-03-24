from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class ReceptionCheckin(NoNameCoreModel):
    prefixo = "CHK"

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

    paciente = models.ForeignKey(
        "clinico.Patient",
        on_delete=models.PROTECT,
        related_name="checkins",
        db_index=True,
    )

    requisicao = models.OneToOneField(
        "clinico.LabRequest",
        on_delete=models.PROTECT,
        related_name="checkin",
        null=True,
        blank=True,
    )

    fatura = models.OneToOneField(
        "faturamento.Invoice",
        on_delete=models.PROTECT,
        related_name="checkin",
        null=True,
        blank=True,
    )

    atendente = models.ForeignKey(
        "identidade.User",
        on_delete=models.SET_NULL,
        related_name="checkins_recepcao",
        null=True,
        blank=True,
        db_index=True,
    )

    prioridade = models.CharField(
        max_length=5,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )
    estado = models.CharField(
        max_length=6,
        choices=Status.choices,
        default=Status.AGUARDANDO,
        db_index=True,
    )

    motivo = models.CharField(max_length=255, blank=True, default="")
    observacoes = models.TextField(blank=True, default="")

    chegou_em = models.DateTimeField(default=timezone.now, db_index=True)
    chamado_em = models.DateTimeField(null=True, blank=True)
    concluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Check-in"
        verbose_name_plural = "Check-ins"
        ordering = ["-chegou_em"]
        indexes = [
            models.Index(fields=["inquilino", "chegou_em"]),
            models.Index(fields=["inquilino", "estado"]),
            models.Index(fields=["inquilino", "prioridade"]),
        ]

    # =====================================================
    # STATE MACHINE (simples)
    # =====================================================

    def start_care(self, attendant=None):
        if self.estado in {self.Status.CONCLUIDO, self.Status.CANCELADO}:
            raise ValidationError("Check-in já foi finalizado.")

        if attendant is not None:
            self.atendente = attendant

        self.estado = self.Status.EM_ATENDIMENTO
        if not self.chamado_em:
            self.chamado_em = timezone.now()

        self.save(update_fields=["atendente", "estado", "chamado_em"])

    def register_request(self, request):
        if self.requisicao_id:
            return
        self.requisicao = request
        self.estado = self.Status.REQUISICAO_CRIADA
        self.save(update_fields=["requisicao", "estado"])

    def register_invoice(self, invoice):
        if self.fatura_id:
            return
        self.fatura = invoice
        self.estado = self.Status.FATURA_VINCULADA
        self.save(update_fields=["fatura", "estado"])

    def concluir(self):
        if self.estado == self.Status.CANCELADO:
            raise ValidationError("Check-in cancelado não pode ser concluído.")
        self.estado = self.Status.CONCLUIDO
        self.concluido_em = timezone.now()
        self.save(update_fields=["estado", "concluido_em"])

    def cancelar(self):
        if self.estado == self.Status.CONCLUIDO:
            raise ValidationError("Check-in concluído não pode ser cancelado.")
        self.estado = self.Status.CANCELADO
        self.concluido_em = timezone.now()
        self.save(update_fields=["estado", "concluido_em"])

    def __str__(self) -> str:
        return self.id_custom or f"Checkin {self.pk}"


ReceptionCheckin.iniciar_atendimento = ReceptionCheckin.start_care
ReceptionCheckin.registrar_requisicao = ReceptionCheckin.register_request
ReceptionCheckin.registrar_fatura = ReceptionCheckin.register_invoice
CheckinRecepcao = ReceptionCheckin
