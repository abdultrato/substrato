from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel


class CheckinRecepcao(NoNameCoreModel):
    prefixo = "CHK"

    class Prioridade(models.TextChoices):
        NORMAL = "NOR", "Normal"
        PREFERENCIAL = "PREF", "Preferencial"
        URGENTE = "URG", "Urgente"

    class Estado(models.TextChoices):
        AGUARDANDO = "AGU", "Aguardando"
        EM_ATENDIMENTO = "ATE", "Em atendimento"
        REQUISICAO_CRIADA = "REQ", "Requisição criada"
        FATURA_VINCULADA = "FAT", "Fatura vinculada"
        CONCLUIDO = "CON", "Concluído"
        CANCELADO = "CAN", "Cancelado"

    paciente = models.ForeignKey(
        "clinico.Paciente",
        on_delete=models.PROTECT,
        related_name="checkins_recepcao",
    )
    requisicao = models.OneToOneField(
        "clinico.RequisicaoAnalise",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="checkin_recepcao",
    )
    fatura = models.OneToOneField(
        "faturamento.Fatura",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="checkin_recepcao",
    )
    atendente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checkins_atendidos",
    )
    prioridade = models.CharField(
        max_length=4,
        choices=Prioridade.choices,
        default=Prioridade.NORMAL,
        db_index=True,
    )
    estado = models.CharField(
        max_length=4,
        choices=Estado.choices,
        default=Estado.AGUARDANDO,
        db_index=True,
    )
    motivo = models.CharField(max_length=255, blank=True)
    observacoes = models.TextField(blank=True)
    chegou_em = models.DateTimeField(default=timezone.now, db_index=True)
    chamado_em = models.DateTimeField(null=True, blank=True)
    concluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-chegou_em"]
        indexes = [
            models.Index(fields=["inquilino", "estado"]),
            models.Index(fields=["inquilino", "chegou_em"]),
            models.Index(fields=["prioridade"]),
        ]

    def _garantir_aberto(self):
        if self.estado == self.Estado.CANCELADO:
            raise ValidationError("Check-in cancelado não pode ser alterado.")
        if self.estado == self.Estado.CONCLUIDO:
            raise ValidationError("Check-in concluído não pode ser alterado.")

    def clean(self):
        if self.paciente_id and not self.inquilino_id:
            self.inquilino = self.paciente.inquilino

        if self.paciente_id and self.inquilino_id and self.paciente.inquilino_id != self.inquilino_id:
            raise ValidationError({"paciente": "Paciente e check-in devem pertencer ao mesmo inquilino."})

        if self.requisicao_id:
            if self.requisicao.inquilino_id != self.inquilino_id:
                raise ValidationError({"requisicao": "Requisição pertence a outro inquilino."})
            if self.requisicao.paciente_id != self.paciente_id:
                raise ValidationError({"requisicao": "Requisição deve pertencer ao mesmo paciente do check-in."})

        if self.fatura_id:
            if self.fatura.inquilino_id != self.inquilino_id:
                raise ValidationError({"fatura": "Fatura pertence a outro inquilino."})
            if self.fatura.paciente_id and self.fatura.paciente_id != self.paciente_id:
                raise ValidationError({"fatura": "Fatura deve pertencer ao mesmo paciente do check-in."})

    def save(self, *args, **kwargs):
        if self.paciente_id and not self.inquilino_id:
            self.inquilino = self.paciente.inquilino

        self.full_clean()
        return super().save(*args, **kwargs)

    def iniciar_atendimento(self, atendente=None):
        self._garantir_aberto()

        campos = ["estado"]
        self.estado = self.Estado.EM_ATENDIMENTO

        if not self.chamado_em:
            self.chamado_em = timezone.now()
            campos.append("chamado_em")

        if atendente is not None and self.atendente_id != getattr(atendente, "id", None):
            self.atendente = atendente
            campos.append("atendente")

        self.save(update_fields=campos)

    def registrar_requisicao(self, requisicao):
        self._garantir_aberto()

        if requisicao.paciente_id != self.paciente_id:
            raise ValidationError("Requisição deve pertencer ao mesmo paciente do check-in.")
        if requisicao.inquilino_id != self.inquilino_id:
            raise ValidationError("Requisição pertence a outro inquilino.")

        self.requisicao = requisicao
        self.estado = self.Estado.REQUISICAO_CRIADA
        self.save(update_fields=["requisicao", "estado"])

    def registrar_fatura(self, fatura):
        self._garantir_aberto()

        if fatura.inquilino_id != self.inquilino_id:
            raise ValidationError("Fatura pertence a outro inquilino.")
        if fatura.paciente_id and fatura.paciente_id != self.paciente_id:
            raise ValidationError("Fatura deve pertencer ao mesmo paciente do check-in.")

        self.fatura = fatura
        self.estado = self.Estado.FATURA_VINCULADA
        self.save(update_fields=["fatura", "estado"])

    def concluir(self):
        if self.estado == self.Estado.CANCELADO:
            raise ValidationError("Check-in cancelado não pode ser concluído.")

        self.estado = self.Estado.CONCLUIDO
        if not self.concluido_em:
            self.concluido_em = timezone.now()

        campos = ["estado", "concluido_em"]
        if not self.chamado_em:
            self.chamado_em = timezone.now()
            campos.append("chamado_em")

        self.save(update_fields=campos)

    def cancelar(self):
        if self.estado == self.Estado.CONCLUIDO:
            raise ValidationError("Check-in concluído não pode ser cancelado.")

        self.estado = self.Estado.CANCELADO
        self.save(update_fields=["estado"])

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"
