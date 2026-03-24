from django.db import models
from django.utils import timezone

from core.mixins.model.description import DescricaoMixin
from core.mixins.model.order import OrdemMixin
from core.models import CoreModel


class ProcedureAuthorization(DescricaoMixin, OrdemMixin, CoreModel):
    """
    Insurer authorization request for a procedure/request.
    """

    prefixo = "AUT"

    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        APROVADA = "APROVADA", "Aprovada"
        NEGADA = "NEGADA", "Negada"

    requisicao_id = models.CharField(max_length=60, db_index=True)

    plano = models.ForeignKey(
        "seguradora.CoveragePlan",
        on_delete=models.PROTECT,
        related_name="autorizacoes",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDENTE,
        db_index=True,
    )

    codigo_autorizacao = models.CharField(
        max_length=80,
        blank=True,
        null=True,
        db_index=True,
    )

    data_resposta = models.DateTimeField(blank=True, null=True)

    # Compatibilidade com filtros/viewsets gerados
    nome = models.CharField(max_length=120, blank=True, null=True, db_index=True)
    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Autorização de Procedimento"
        verbose_name_plural = "Autorizações de Procedimento"

    def mark_response(self, status, authorization_code=None):
        self.status = status
        self.codigo_autorizacao = authorization_code
        self.data_resposta = timezone.now()
        self.save(update_fields=["status", "codigo_autorizacao", "data_resposta"])

    def __str__(self) -> str:
        return self.id_custom or f"Autorizacao {self.pk}"


ProcedureAuthorization.marcar_resposta = ProcedureAuthorization.mark_response
