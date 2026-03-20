from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from infrastrutura.orm.fields.dinheiro_field import DinheiroField
from infrastrutura.orm.fields.metodo_exame_medico_field import MetodoExameMedicoField
from infrastrutura.orm.fields.setor_exame_medico_field import SetorExameMedicoField
from nucleo.constantes.exame_medico.metodo_exame_medico import MetodoExameMedico
from nucleo.constantes.exame_medico.tipo_resultado_exame_medico import TipoResultadoExameMedico
from nucleo.mixins.tenant_propagation import PropagarInquilinoMixin
from nucleo.modelos.base import CoreModel


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


def tipos_resultado_permitidos_para_metodo(metodo):
    if not metodo:
        return set(TipoResultadoExameMedico.values)
    tipos = TIPOS_RESULTADO_POR_METODO_EXAME_MEDICO.get(metodo)
    if tipos:
        return set(tipos)
    return set(TipoResultadoExameMedico.values)


class ExameMedico(PropagarInquilinoMixin, CoreModel):
    """
    Exames médicos de imagem/diagnóstico (ex.: ecografia, raios-x, ecocardiograma).
    Segue o mesmo formato de Exame.
    """

    fonte_inquilino = "paciente"
    prefixo = "EXM"

    trl_horas = models.PositiveIntegerField(
        verbose_name="Tempo de resposta (em horas)",
        default=24,
        help_text="Tempo de resposta em horas.",
    )

    preco = DinheiroField(
        verbose_name="Preço do exame médico",
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Preço do exame médico.",
    )

    iva_percentual = models.DecimalField(
        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao exame médico (0 a 100).",
    )

    aplica_iva_por_padrao = models.BooleanField(
        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este exame normalmente não deve ter IVA.",
    )

    metodo = MetodoExameMedicoField(
        verbose_name="Método do exame (imagem/diagnóstico)",
        db_index=True,
    )

    setor = SetorExameMedicoField(
        verbose_name="Setor do exame (imagem/diagnóstico)",
        db_index=True,
    )

    class Meta:
        verbose_name = "Exame médico"
        verbose_name_plural = "Exames médicos"
        ordering = ["nome", "criado_em"]
        indexes = [
            models.Index(fields=["setor", "deletado"]),
            models.Index(fields=["metodo"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["setor", "nome"],
                condition=Q(deletado=False),
                name="unique_nome_exame_medico_por_setor_nao_deletado",
            ),
            models.CheckConstraint(
                check=Q(trl_horas__gt=0),
                name="exm_trl_horas_positivo",
            ),
            models.CheckConstraint(
                check=Q(preco__gte=0),
                name="exm_preco_nao_negativo",
            ),
        ]

    def clean(self):
        super().clean()
        erros = {}
        if not self.nome:
            erros["nome"] = "O exame deve possuir um nome."
        if self.preco is None:
            erros["preco"] = "O exame deve possuir um preço."
        if self.preco == Decimal("0.00"):
            erros["preco"] = "Exame não pode ter preço zero."
        if self.trl_horas <= 0:
            erros["trl_horas"] = "TRL deve ser maior que zero."
        if erros:
            raise ValidationError(erros)

    @property
    def tipos_resultado_permitidos(self):
        return tipos_resultado_permitidos_para_metodo(self.metodo)

    @property
    def tipos_resultado_cadastrados(self):
        if not self.pk:
            return self.tipos_resultado_permitidos
        tipos = set(self.campos.values_list("tipo", flat=True))
        return tipos or self.tipos_resultado_permitidos

    def __str__(self):
        return f"{self.nome or 'exame médico sem nome'}"


class ExameMedicoCampo(PropagarInquilinoMixin, CoreModel):
    prefixo = "EMC"

    exame = models.ForeignKey(
        "clinico.ExameMedico",
        on_delete=models.CASCADE,
        related_name="campos",
        verbose_name="Exame médico",
    )

    tipo = models.CharField(
        max_length=20,
        choices=TipoResultadoExameMedico.choices,
        verbose_name="Tipo de parâmetro/arquivo",
    )

    class Meta:
        verbose_name = "parâmetro de exame médico"
        verbose_name_plural = "parâmetros de exame médico"

    def clean(self):
        super().clean()
        if self.exame_id and self.tipo:
            permitidos = self.exame.tipos_resultado_permitidos
            if self.tipo not in permitidos:
                metodo = self.exame.get_metodo_display() or self.exame.metodo
                permitidos_fmt = ", ".join(sorted(permitidos))
                raise ValidationError(
                    {
                        "tipo": (
                            f"Tipo não permitido para o método {metodo}. "
                            f"Permitidos: {permitidos_fmt}."
                        )
                    }
                )

    def __str__(self):
        return self.nome
