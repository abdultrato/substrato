from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel


class CheckinRecepcao(NoNameCoreModel):
    prefixo = "CHK"

    class Prioridade(models.TextChoices):
        URGENTE = "URG", "Urgente"
        PREFERENCIAL = "PREF", "Preferencial"
        NORMAL = "NOR", "Normal"

    class Estado(models.TextChoices):
        AGUARDANDO = "AGUARD", "Aguardando"
        EM_ATENDIMENTO = "ATEND", "Em atendimento"
        REQUISICAO_CRIADA = "REQ", "Requisição criada"
        FATURA_VINCULADA = "FAT", "Fatura vinculada"
        CONCLUIDO = "CONC", "Concluído"
        CANCELADO = "CANC", "Cancelado"

    paciente = models.ForeignKey(
        "clinico.Paciente",
        on_delete=models.PROTECT,
        related_name="checkins",
        db_index=True,
    )

    requisicao = models.OneToOneField(
        "clinico.RequisicaoAnalise",
        on_delete=models.PROTECT,
        related_name="checkin",
        null=True,
        blank=True,
    )

    fatura = models.OneToOneField(
        "faturamento.Fatura",
        on_delete=models.PROTECT,
        related_name="checkin",
        null=True,
        blank=True,
    )

    atendente = models.ForeignKey(
        "identidade.Usuario",
        on_delete=models.SET_NULL,
        related_name="checkins_recepcao",
        null=True,
        blank=True,
        db_index=True,
    )

    prioridade = models.CharField(
        max_length=5,
        choices=Prioridade.choices,
        default=Prioridade.NORMAL,
        db_index=True,
    )
    estado = models.CharField(
        max_length=6,
        choices=Estado.choices,
        default=Estado.AGUARDANDO,
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

    def iniciar_atendimento(self, atendente=None):
        if self.estado in {self.Estado.CONCLUIDO, self.Estado.CANCELADO}:
            raise ValidationError("Check-in já foi finalizado.")

        if atendente is not None:
            self.atendente = atendente

        self.estado = self.Estado.EM_ATENDIMENTO
        if not self.chamado_em:
            self.chamado_em = timezone.now()

        self.save(update_fields=["atendente", "estado", "chamado_em"])

    def registrar_requisicao(self, requisicao):
        if self.requisicao_id:
            return
        self.requisicao = requisicao
        self.estado = self.Estado.REQUISICAO_CRIADA
        self.save(update_fields=["requisicao", "estado"])

    def registrar_fatura(self, fatura):
        if self.fatura_id:
            return
        self.fatura = fatura
        self.estado = self.Estado.FATURA_VINCULADA
        self.save(update_fields=["fatura", "estado"])

    def concluir(self):
        if self.estado == self.Estado.CANCELADO:
            raise ValidationError("Check-in cancelado não pode ser concluído.")
        self.estado = self.Estado.CONCLUIDO
        self.concluido_em = timezone.now()
        self.save(update_fields=["estado", "concluido_em"])

    def cancelar(self):
        if self.estado == self.Estado.CONCLUIDO:
            raise ValidationError("Check-in concluído não pode ser cancelado.")
        self.estado = self.Estado.CANCELADO
        self.concluido_em = timezone.now()
        self.save(update_fields=["estado", "concluido_em"])

    def __str__(self) -> str:
        return self.id_custom or f"Checkin {self.pk}"
