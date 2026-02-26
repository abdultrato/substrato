from django.conf import settings
from django.db import models

from nucleo.modelos.base import CoreModel
from .paciente import Paciente
from .exame import Exame

User = settings.AUTH_USER_MODEL


class RequisicaoAnalise(CoreModel):

    prefixo = "REQ"

    class Status(models.TextChoices):
        CRIADA = "CRI", "Criada"
        EM_PROCESSAMENTO = "PROC", "Em Processamento"
        AGUARDANDO_VALIDACAO = "AGV", "Aguardando Validação"
        VALIDADA = "VAL", "Validada"
        CANCELADA = "CANC", "Cancelada"

    class StatusClinico(models.TextChoices):
        NORMAL = "normal", "Normal"
        ALERTA = "alerta", "Alerta"
        CRITICO = "critico", "Crítico"

    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name="requisicoes",
    )

    # 🔥 agora usando through
    exames = models.ManyToManyField(
        Exame,
        through="RequisicaoItem",
        related_name="requisicoes",
    )

    analista = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requisicoes_processadas",
    )

    observacoes = models.TextField(blank=True)

    status = models.CharField(
        max_length=4,
        choices=Status.choices,
        default=Status.CRIADA,
        db_index=True,
    )

    status_clinico = models.CharField(
        max_length=10,
        choices=StatusClinico.choices,
        default=StatusClinico.NORMAL,
        db_index=True,
    )

    possui_resultado_critico = models.BooleanField(default=False)

    class Meta:
        ordering = ["-criado_em"]

    def aplicar_status(self, novo_status):
        self.status = novo_status
        self.save(update_fields=["status"])

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"
