from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from infrastrutura.orm.fields.dinheiro_field import DinheiroField
from infrastrutura.orm.fields.metodo_field import MetodoField
from infrastrutura.orm.fields.setor_field import SetorField
from nucleo.constantes.laboratorio.tipo_resultado import TipoResultado
from nucleo.constantes.laboratorio.unidades import UnidadePadrao
from nucleo.mixins.tenant_propagation import PropagarInquilinoMixin
from nucleo.modelos.base import CoreModel


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

    metodo = MetodoField(
        verbose_name="Método do exame",
        db_index=True,
    )

    setor = SetorField(
        verbose_name="Setor do exame",
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
        choices=TipoResultado.choices,
        verbose_name="Tipo de parâmetro",
    )

    unidade = models.CharField(
        max_length=30,
        choices=UnidadePadrao.choices,
        default=UnidadePadrao.P_UL,
        verbose_name="Unidade de medida",
    )

    referencia_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Referência mínima",
    )

    referencia_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Referência máxima",
    )

    critico_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Valor crítico mínimo",
    )

    critico_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Valor crítico máximo",
    )

    delta_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Delta máximo permitido",
    )

    class Meta:
        verbose_name = "parâmetro de exame médico"
        verbose_name_plural = "parâmetros de exame médico"

    def __str__(self):
        return self.nome

    @property
    def referencia(self):
        if self.referencia_min is None and self.referencia_max is None:
            return None
        if self.referencia_min is not None and self.referencia_max is not None:
            return f"{self.referencia_min} - {self.referencia_max}"
        if self.referencia_min is not None:
            return f">= {self.referencia_min}"
        if self.referencia_max is not None:
            return f"<= {self.referencia_max}"
        return None

    def interpretar_resultado(self, valor):
        if valor is None:
            return None
        try:
            valor = Decimal(valor)
        except Exception:
            return None
        if self.critico_min is not None and valor < self.critico_min:
            return "↓↓"
        if self.critico_max is not None and valor > self.critico_max:
            return "↑↑"
        if self.referencia_min is not None and valor < self.referencia_min:
            return "↓"
        if self.referencia_max is not None and valor > self.referencia_max:
            return "↑"
        return "N"
