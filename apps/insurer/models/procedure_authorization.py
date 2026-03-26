from django.db import models
from django.utils import timezone

from core.mixins.model.description import DescriptionMixin
from core.mixins.model.order import OrderMixin
from core.models import CoreModel


class ProcedureAuthorization(DescriptionMixin, OrderMixin, CoreModel):
    """
    Insurer authorization request for a procedure/request.
    """

    prefix = "AUT"

    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        APROVADA = "APROVADA", "Aprovada"
        NEGADA = "NEGADA", "Negada"

    request_id = models.CharField(
        db_column="request_id",
        verbose_name="ID da requisição",
        max_length=60, db_index=True)

    plan = models.ForeignKey(
        "seguradora.CoveragePlan",
        verbose_name="Plano",
        db_column="plan_id",
        on_delete=models.PROTECT,
        related_name="autorizacoes",
    )

    status = models.CharField(
        verbose_name="Status",
        max_length=20,
        choices=Status.choices,
        default=Status.PENDENTE,
        db_index=True,
    )

    authorization_code = models.CharField(
        db_column="authorization_code",
        verbose_name="Código de autorização",
        max_length=80,
        blank=True,
        null=True,
        db_index=True,
    )

    response_date = models.DateTimeField(
        db_column="response_date",
        verbose_name="Data da resposta",
        blank=True, null=True)

    # Compatibilidade com filtros/viewsets gerados
    name = models.CharField(
        "Nome",
        db_column="name",
        max_length=120,
        blank=True,
        null=True,
        db_index=True,
    )
    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativo",
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
