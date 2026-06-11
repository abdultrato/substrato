from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class RequestingSector(models.TextChoices):
    LABORATORIO = "LAB", "Laboratório"
    ENFERMAGEM = "ENF", "Enfermagem"
    RECEPCAO = "REC", "Recepção"
    MEDICINA = "MED", "Medicina"
    MEDICINA_OCUPACIONAL = "MOC", "Medicina Ocupacional"
    FARMACIA = "FAR", "Farmácia"
    FARMACIA_CLINICA = "FCL", "Farmácia Clínica"
    ODONTOLOGIA = "ODO", "Odontologia"
    VETERINARIA = "VET", "Medicina Veterinária"
    FISIOTERAPIA = "FIS", "Fisioterapia"
    RADIOLOGIA = "RAD", "Radiologia"
    CARDIOLOGIA = "CAR", "Cardiologia"
    NEUROLOGIA = "NEU", "Neurologia"
    OFTALMOLOGIA = "OFT", "Oftalmologia"
    TERAPIA_OCUPACIONAL = "TOC", "Terapia Ocupacional"
    FONOAUDIOLOGIA = "FON", "Fonoaudiologia"
    TELEMEDICINA = "TLM", "Telemedicina"
    SAUDE_PUBLICA = "SPU", "Saúde Pública"
    CREDITO_FINANCIAMENTO = "CRF", "Créditos e Financiamento"
    LOGISTICA = "LOG", "Logística"
    MANUTENCAO = "MAN", "Manutenção"
    CONTABILIDADE = "CON", "Contabilidade"
    RECURSOS_HUMANOS = "RHU", "Recursos Humanos"
    EDUCACAO = "EDU", "Educação"
    OUTROS = "OUT", "Outros setores"


class RequisitionSource(models.TextChoices):
    PHARMACY = "PHA", "Estoque da farmácia"
    WAREHOUSE = "WHS", "Armazém central"


def source_for_sector(sector: str | None) -> str:
    """A farmácia abastece-se no armazém; os demais setores abastecem-se na farmácia."""
    if sector == RequestingSector.FARMACIA:
        return RequisitionSource.WAREHOUSE
    return RequisitionSource.PHARMACY


class MaterialRequisitionStatus(models.TextChoices):
    PENDING = "PEN", "Pendente"
    PARTIAL = "PAR", "Parcialmente aviada"
    FULFILLED = "FUL", "Aviada"
    ON_HOLD = "HLD", "Arquivada (aguarda estoque)"


class MaterialRequisition(NoNameCoreModel):
    """
    Requisição interna de materiais (multi-setor).

    - Setores clínicos (incl. Farmácia Clínica) requisitam à Farmácia (source=PHA)
    - A Farmácia requisita insumos ao Armazém central (source=WHS)
    - Aviada (total/parcial) pela Farmácia
    - Pode ser arquivada quando não é possível atender no momento
    """

    prefix = "REQFAR"

    sector = models.CharField(
        db_column="sector",
        verbose_name="Setor solicitante",
        max_length=3,
        choices=RequestingSector.choices,
        db_index=True,
    )

    source = models.CharField(
        db_column="source",
        verbose_name="Fonte de abastecimento",
        max_length=3,
        choices=RequisitionSource.choices,
        default=RequisitionSource.PHARMACY,
        db_index=True,
    )

    requested_by_department = models.CharField(
        db_column="requested_by_department",
        verbose_name="Departamento (snapshot)",
        max_length=120,
        blank=True,
        default="",
        help_text="Departamento do utilizador no momento da requisição.",
    )

    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=3,
        choices=MaterialRequisitionStatus.choices,
        default=MaterialRequisitionStatus.PENDING,
        db_index=True,
    )

    hold_reason = models.TextField(
        db_column="hold_reason",
        verbose_name="Motivo do arquivamento",
        null=True,
        blank=True,
        default=None,
    )

    fulfilled_at = models.DateTimeField(
        db_column="fulfilled_at",
        verbose_name="Aviada em",
        null=True,
        blank=True,
        default=None,
        db_index=True,
    )
    fulfilled_by = models.ForeignKey(
        "identidade.User",
        db_column="fulfilled_by_id",
        verbose_name="Aviada por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="materialrequisicao_aviada",
        db_index=True,
    )

    on_hold_at = models.DateTimeField(
        db_column="on_hold_at",
        verbose_name="Arquivada em",
        null=True,
        blank=True,
        default=None,
        db_index=True,
    )
    on_hold_by = models.ForeignKey(
        "identidade.User",
        db_column="on_hold_by_id",
        verbose_name="Arquivada por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="materialrequisicao_arquivada",
        db_index=True,
    )

    class Meta:
        db_table = "farmacia_requisicaomaterial"
        verbose_name = "Requisição de material"
        verbose_name_plural = "Requisições de material"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "created_at"]),
            models.Index(fields=["tenant", "sector", "created_at"]),
        ]

    def clean(self):
        super().clean()

        # Consistência estado vs campos de auditoria do workflow.
        if self.status == MaterialRequisitionStatus.ON_HOLD and not self.on_hold_at:
            raise ValidationError("Requisições arquivadas devem ter data de arquivamento.")

        if self.status == MaterialRequisitionStatus.FULFILLED and not self.fulfilled_at:
            raise ValidationError("Requisições aviadas devem ter data de avio.")

