from django.db import models
from django.utils import timezone

from core.mixins.model.description import DescricaoMixin
from core.mixins.model.order import OrdemMixin
from core.models import CoreModel


class ProcedureAuthorization(DescricaoMixin, OrdemMixin, CoreModel):
    """
    Insurer authorization request for a procedure/request.
    """

    prefix = "AUT"

    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        APROVADA = "APROVADA", "Aprovada"
        NEGADA = "NEGADA", "Negada"

    request_id = models.CharField(

        db_column="requisicao_id",

        max_length=60, db_index=True)

    plan = models.ForeignKey(

        "seguradora.CoveragePlan",

        db_column="plano_id",
        on_delete=models.PROTECT,
        related_name="autorizacoes",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDENTE,
        db_index=True,
    )

    authorization_code = models.CharField(

        db_column="codigo_autorizacao",

        max_length=80,
        blank=True,
        null=True,
        db_index=True,
    )

    response_date = models.DateTimeField(

        db_column="data_resposta",

        blank=True, null=True)

    # Compatibilidade com filtros/viewsets gerados
    name = models.CharField(db_column="nome", max_length=120, blank=True, null=True, db_index=True)
    active = models.BooleanField(
        db_column="ativo",
        default=True, db_index=True)

    class Meta:
        db_table = "seguradora_autorizacaoprocedimento"
        verbose_name = "Autorização de Procedimento"
        verbose_name_plural = "Autorizações de Procedimento"

    def mark_response(self, status, authorization_code=None):
        self.status = status
        self.authorization_code = authorization_code
        self.response_date = timezone.now()
        self.save(update_fields=["status", "authorization_code", "response_date"])

    def __str__(self) -> str:
        return self.custom_id or f"Autorizacao {self.pk}"


ProcedureAuthorization.marcar_response = ProcedureAuthorization.mark_response
