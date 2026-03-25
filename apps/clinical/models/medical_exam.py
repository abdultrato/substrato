from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from core.constants.medical_exam.medical_exam_method import MetodoExameMedico
from core.constants.medical_exam.medical_exam_result_type import TipoResultadoExameMedico
from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import CoreModel
from infrastructure.orm.fields.medical_exam_method_field import MedicalExamMethodField
from infrastructure.orm.fields.medical_exam_sector_field import MedicalExamSectorField
from infrastructure.orm.fields.money_field import MoneyField

TIPOS_RESULTADO_POR_METODO_EXAME_MEDICO = {
    MetodoExameMedico.ULTRASSONOGRAFIA: {
        TipoResultadoExameMedico.IMAGEM,
        TipoResultadoExameMedico.RELATORIO_PDF,
        TipoResultadoExameMedico.VIDEO,
    },
    MetodoExameMedico.RAIOX_CONVENCIONAL: {
        TipoResultadoExameMedico.IMAGEM,
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.TOMOGRAFIA: {
        TipoResultadoExameMedico.DICOM,
        TipoResultadoExameMedico.IMAGEM,
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.RESSONANCIA: {
        TipoResultadoExameMedico.DICOM,
        TipoResultadoExameMedico.IMAGEM,
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.MAMOGRAFIA: {
        TipoResultadoExameMedico.IMAGEM,
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.DENSITOMETRIA: {
        TipoResultadoExameMedico.RELATORIO_PDF,
        TipoResultadoExameMedico.IMAGEM,
    },
    MetodoExameMedico.ECOCARDIOGRAMA: {
        TipoResultadoExameMedico.IMAGEM,
        TipoResultadoExameMedico.RELATORIO_PDF,
        TipoResultadoExameMedico.VIDEO,
    },
    MetodoExameMedico.ELETROCARDIOGRAMA: {
        TipoResultadoExameMedico.RELATORIO_PDF,
        TipoResultadoExameMedico.IMAGEM,
    },
    MetodoExameMedico.HOLTER: {
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.MAPA: {
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.EEG: {
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.ENDOSCOPIA: {
        TipoResultadoExameMedico.VIDEO,
        TipoResultadoExameMedico.IMAGEM,
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.COLONOSCOPIA: {
        TipoResultadoExameMedico.VIDEO,
        TipoResultadoExameMedico.IMAGEM,
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.ANGIOGRAFIA: {
        TipoResultadoExameMedico.DICOM,
        TipoResultadoExameMedico.IMAGEM,
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
    MetodoExameMedico.MEDICINA_NUCLEAR: {
        TipoResultadoExameMedico.DICOM,
        TipoResultadoExameMedico.RELATORIO_PDF,
    },
}


def allowed_result_types_for_method(method):
    if not method:
        return set(TipoResultadoExameMedico.values)
    tipos = TIPOS_RESULTADO_POR_METODO_EXAME_MEDICO.get(method)
    if tipos:
        return set(tipos)
    return set(TipoResultadoExameMedico.values)


class MedicalExam(PropagarInquilinoMixin, CoreModel):
    """
    Exames médicos de imagem/diagnóstico (ex.: ecografia, raios-x, ecocardiograma).
    Segue o mesmo formato de Exame.
    """

    fonte_tenant = "patient"
    prefix = "EXM"

    turnaround_hours = models.PositiveIntegerField(

        db_column="trl_horas",

        verbose_name="Tempo de response (em hours)",
        default=24,
        help_text="Tempo de response em hours.",
    )

    price = MoneyField(

        db_column="preco",

        verbose_name="Preço do exam médico",
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Preço do exam médico.",
    )

    vat_percentage = models.DecimalField(

        db_column="iva_percentual",

        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao exam médico (0 a 100).",
    )

    applies_vat_by_default = models.BooleanField(

        db_column="aplica_iva_por_padrao",

        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este exam normalmente não deve ter IVA.",
    )

    method = MedicalExamMethodField(
        verbose_name="Método do exam (imagem/diagnóstico)",
        db_index=True,
    )

    sector = MedicalExamSectorField(
        verbose_name="Setor do exam (imagem/diagnóstico)",
        db_index=True,
    )

    class Meta:
        db_table = "clinico_examemedico"
        verbose_name = "Exame médico"
        verbose_name_plural = "Exames médicos"
        ordering = ["name", "created_at"]
        indexes = [
            models.Index(fields=["sector", "deleted"]),
            models.Index(fields=["method"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["sector", "name"],
                condition=Q(deleted=False),
                name="unique_name_medical_exam_por_sector_nao_deleted",
            ),
            models.CheckConstraint(
                check=Q(turnaround_hours__gt=0),
                name="exm_turnaround_hours_positivo",
            ),
            models.CheckConstraint(
                check=Q(price__gte=0),
                name="exm_price_nao_negativo",
            ),
        ]

    def clean(self):
        super().clean()
        erros = {}
        if not self.name:
            erros["name"] = "O exam deve possuir um name."
        if self.price is None:
            erros["price"] = "O exam deve possuir um preço."
        if self.price == Decimal("0.00"):
            erros["price"] = "Exame não pode ter preço zero."
        if self.turnaround_hours <= 0:
            erros["turnaround_hours"] = "TRL deve ser maior que zero."
        if erros:
            raise ValidationError(erros)

    @property
    def allowed_result_types(self):
        return allowed_result_types_for_method(self.method)

    @property
    def registered_result_types(self):
        if not self.pk:
            return self.allowed_result_types
        tipos = set(self.campos.values_list("type", flat=True))
        return tipos or self.allowed_result_types

    def __str__(self):
        return f"{self.name or 'exam médico sem name'}"

    tipos_result_permitidos = allowed_result_types
    tipos_result_cadastrados = registered_result_types


class MedicalExamField(PropagarInquilinoMixin, CoreModel):
    prefix = "EMC"

    exam = models.ForeignKey(

        "clinico.MedicalExam",

        db_column="exame_id",
        on_delete=models.CASCADE,
        related_name="campos",
        verbose_name="Exame médico",
    )

    type = models.CharField(

        db_column="tipo",

        max_length=20,
        choices=TipoResultadoExameMedico.choices,
        verbose_name="Tipo de parâmetro/file",
    )

    class Meta:
        db_table = "clinico_examemedicocampo"
        verbose_name = "parâmetro de exam médico"
        verbose_name_plural = "parâmetros de exam médico"

    def clean(self):
        super().clean()
        if self.exam_id and self.type:
            permitidos = self.exam.allowed_result_types
            if self.type not in permitidos:
                method = self.exam.get_method_display() or self.exam.method
                permitidos_fmt = ", ".join(sorted(permitidos))
                raise ValidationError(
                    {
                        "type": (
                            f"Tipo não permitido para o método {method}. "
                            f"Permitidos: {permitidos_fmt}."
                        )
                    }
                )

    def __str__(self):
        return self.name


tipos_result_permitidos_para_method = allowed_result_types_for_method

