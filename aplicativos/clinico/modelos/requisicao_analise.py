from django.conf import settings
from django.db import models

from nucleo.modelos.base import CoreModel
from .paciente import Paciente
from .exame import Exame


User = settings.AUTH_USER_MODEL


class RequisicaoAnalise(CoreModel):

    prefixo = "REQ"

    # =========================================================
    # STATUS OPERACIONAL
    # =========================================================
    class Status(models.TextChoices):
        CRIADA = "CRI", "Criada"
        EM_PROCESSAMENTO = "PROC", "Em Processamento"
        AGUARDANDO_VALIDACAO = "AGV", "Aguardando Validação"
        VALIDADA = "VAL", "Validada"
        CANCELADA = "CANC", "Cancelada"

    # =========================================================
    # STATUS CLÍNICO GLOBAL
    # =========================================================
    class StatusClinico(models.TextChoices):
        NORMAL = "normal", "Normal"
        ALERTA = "alerta", "Alerta"
        CRITICO = "critico", "Crítico"

    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name="requisicoes",
    )

    exames = models.ManyToManyField(
        Exame,
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

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"

    # =========================================================
    # TRANSIÇÃO AUTOMÁTICA DE STATUS
    # =========================================================
    def atualizar_fluxo(self):

        resultados = self.resultados.all()

        if not resultados.exists():
            self.status = self.Status.CRIADA
            self.save(update_fields=["status"])
            return

        if resultados.filter(valor__isnull=False).exists():
            self.status = self.Status.EM_PROCESSAMENTO

        if resultados.filter(valor__isnull=True).count() == 0:
            self.status = self.Status.AGUARDANDO_VALIDACAO

        self.save(update_fields=["status"])

    # =========================================================
    # VALIDAÇÃO FINAL
    # =========================================================
    def validar(self, usuario):

        if self.status != self.Status.AGUARDANDO_VALIDACAO:
            raise ValueError("Requisição não está pronta para validação.")

        if self.possui_resultado_critico:
            raise ValueError("Existem resultados críticos.")

        self.status = self.Status.VALIDADA
        self.analista = usuario

        self.save(update_fields=["status", "analista"])
