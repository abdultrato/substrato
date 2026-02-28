from django.db import models
from django.utils import timezone
from nucleo.modelos.base import CoreModel


class AutorizacaoProcedimento(CoreModel):
    """
    Pedido de autorização junto à seguradora.
    """

    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        APROVADA = "APROVADA", "Aprovada"
        NEGADA = "NEGADA", "Negada"

    prefixo = "AUT"

    requisicao_id = models.UUIDField()  # referência à requisição clínica
    plano = models.ForeignKey(
        "seguradora.PlanoCobertura",
        on_delete=models.PROTECT,
        related_name="autorizacoes",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDENTE,
    )

    codigo_autorizacao = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    data_resposta = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Autorização"
        verbose_name_plural = "Autorizações"

    def aprovar(self, codigo):
        self.status = self.Status.APROVADA
        self.codigo_autorizacao = codigo
        self.data_resposta = timezone.now()
        self.save(update_fields=["status", "codigo_autorizacao", "data_resposta"])

    def negar(self):
        self.status = self.Status.NEGADA
        self.data_resposta = timezone.now()
        self.save(update_fields=["status", "data_resposta"])
