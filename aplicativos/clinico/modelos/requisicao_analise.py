from decimal import Decimal as d

from django.conf import settings as s
from django.db import models as m

from .nucleo import (
    ActiveStatusModel as asm,
    AuditModel as am,
    CoreModel as cm,
    SoftDeleteModel as sdm,
    TimeStampedModel as tsm,
)
from .exame import Exame as e
from .mixins import CustomIDSaveMixin as cism
from .paciente import Paciente as p

User = s.AUTH_USER_MODEL


class RequisicaoAnalise(cism, cm, tsm, am, asm, sdm):
    """
    Requisição de exames laboratoriais.
    """

    prefixo = "REQ"

    class Status(m.TextChoices):
        PENDENTE = "PEND", "Pendente"
        VALIDADA = "VAL", "Validada"
        CANCELADA = "CANC", "Cancelada"

    # STATUS CLÍNICO AUTOMÁTICO
    class StatusClinico(m.TextChoices):
        NORMAL = "normal", "Normal"
        ALERTA = "alerta", "Alerta"
        CRITICO = "critico", "Crítico"

    paciente = m.ForeignKey(
        p,
        on_delete=m.CASCADE,
        related_name="requisicoes",
    )

    exames = m.ManyToManyField(
        e,
        related_name="requisicoes",
    )

    analista = m.ForeignKey(
        User,
        on_delete=m.SET_NULL,
        null=True,
        blank=True,
        related_name="requisicoes_processadas",
    )

    observacoes = m.TextField(blank=True)

    status = m.CharField(
        max_length=5,
        choices=Status.choices,
        default=Status.PENDENTE,
    )

    # ===============================
    # CAMPOS CLÍNICOS AUTOMÁTICOS
    # ===============================

    status_clinico = m.CharField(
        max_length=10,
        choices=StatusClinico.choices,
        blank=True,
        default=StatusClinico.NORMAL,
    )

    possui_resultado_critico = m.BooleanField(default=False)

    total = m.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=d("0.00"),
    )

    class Meta:
        verbose_name = "Requisição"
        verbose_name_plural = "Requisições"
        ordering = ["-criado_em"]
        indexes = [
            m.Index(fields=["status"]),
            m.Index(fields=["criado_em"]),
        ]

    def __str__(self):
        return f"{self.id_custom} - {self.paciente}"

    # =========================================================
    # SNAPSHOT FINANCEIRO
    # =========================================================

    def criar_itens_automaticos(self):
        self.itens.all().delete()

        total = d("0.00")

        for exame in self.exames.all():
            item = RequisicaoItem.objects.create(
                requisicao=self,
                exame=exame,
                preco_unitario=exame.preco,
                quantidade=d("1.00"),
            )
            total += item.preco_unitario

        self.total = total
        self.save(update_fields=["total"])

    # =========================================================
    # RESULTADOS AUTOMÁTICOS
    # =========================================================

    def criar_resultados_automaticos(self):
        from .resultado_analise import ResultadoItem

        for exame in self.exames.prefetch_related("campos"):
            for campo in exame.campos.all():
                ResultadoItem.objects.get_or_create(
                    requisicao=self,
                    exame_campo=campo,
                )

    # =========================================================
    # AVALIAÇÃO CLÍNICA DA REQUISIÇÃO
    # =========================================================

    def avaliar_status_clinico(self):
        """
        Determina o status clínico geral com base nos resultados.
        """

        resultados = self.resultados.all()

        if not resultados.exists():
            self.status_clinico = self.StatusClinico.NORMAL
            self.possui_resultado_critico = False
            return

        if resultados.filter(alerta_critico=True).exists():
            self.status_clinico = self.StatusClinico.CRITICO
            self.possui_resultado_critico = True
            return

        if resultados.exclude(status_clinico="normal").exists():
            self.status_clinico = self.StatusClinico.ALERTA
            self.possui_resultado_critico = False
            return

        self.status_clinico = self.StatusClinico.NORMAL
        self.possui_resultado_critico = False

    # =========================================================
    # VALIDAÇÃO SEGURA
    # =========================================================

    def validar(self, usuario):
        """
        Valida requisição somente se não houver resultados críticos.
        """
        self.avaliar_status_clinico()

        if self.status_clinico == self.StatusClinico.CRITICO:
            raise ValueError("Não é possível validar: existem resultados críticos.")

        self.status = self.Status.VALIDADA
        self.analista = usuario
        self.save(update_fields=["status", "analista"])

    # =========================================================
    # SAVE OVERRIDE
    # =========================================================

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # atualizar status clínico após salvar
        self.avaliar_status_clinico()

        super().save(
            update_fields=[
                "status_clinico",
                "possui_resultado_critico",
            ]
        )


class RequisicaoItem(
    m.Model,
    tsm,
    am,
    sdm,
    cm,
):
    requisicao = m.ForeignKey(
        RequisicaoAnalise,
        on_delete=m.CASCADE,
        related_name="itens",
    )

    exame = m.ForeignKey(
        e,
        on_delete=m.PROTECT,
    )

    preco_unitario = m.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    quantidade = m.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=d("1.00"),
    )

    class Meta:
        verbose_name = "Item da Requisição"
        verbose_name_plural = "Itens da Requisição"
        ordering = ["id"]
        unique_together = ("requisicao", "exame")

    def __str__(self):
        return f"{self.exame.nome} ({self.quantidade}x)"
