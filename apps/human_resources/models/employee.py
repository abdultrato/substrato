from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class Employee(CoreModel):
    """
    Funcionário (MVP).

    Observação: o vínculo com usuário (login) é feito via Perfil Profissional.
    """

    prefix = "FUN"  # Prefixo para custom_id

    class Status(models.TextChoices):
        ACTIVE = "ATIVO", "Ativo"
        INACTIVE = "INATIVO", "Inativo"

    role = models.ForeignKey(  # Cargo atual do funcionário
        "recursos_humanos.JobTitle",
        db_column="role_id",
        verbose_name="Cargo",
        on_delete=models.PROTECT,
        related_name="funcionarios",
        null=True,
        blank=True,
        db_index=True,
    )

    profession = models.CharField(  # Profissão declarada
        db_column="profession",
        verbose_name="Profissão",
        max_length=120,
        blank=True,
        default="",
        db_index=True,
    )

    nuit = models.CharField(  # Número fiscal
        verbose_name="NUIT",
        max_length=30,
        blank=True,
        default="",
        db_index=True,
    )

    nib = models.CharField(  # Conta bancária para pagamento
        verbose_name="NIB / Conta bancária",
        max_length=60,
        blank=True,
        default="",
    )

    document_number = models.CharField(  # Documento de identidade
        db_column="document_number",
        verbose_name="Número do documento",
        max_length=60,
        blank=True,
        default="",
        db_index=True,
    )

    email = models.EmailField(verbose_name="E-mail", blank=True, default="")  # Contato
    phone = models.CharField(  # Telefone principal
        db_column="phone",
        verbose_name="Telefone",
        max_length=30,
        blank=True,
        default="",
    )

    admission_date = models.DateField(  # Data de contratação
        db_column="admission_date",
        verbose_name="Data de admissão",
        default=timezone.now,
    )
    status = models.CharField(  # Ativo/Inativo
        db_column="status",
        verbose_name="Estado",
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )

    nominal_salary = MoneyField(  # Salário base mensal
        db_column="nominal_salary",
        verbose_name="Salário nominal",
        default=Decimal("0.00"),
    )
    salary_increase = MoneyField(  # Ajuste por promoção/extra
        db_column="salary_increase",
        verbose_name="Aumento salarial",
        default=Decimal("0.00"),
        help_text="Valor adicional por promoção/aumento (somado ao salário nominal).",
    )
    base_month_hours = models.PositiveSmallIntegerField(  # Jornada mensal contratual
        db_column="base_month_hours",
        verbose_name="Horas base (mês)",
        default=176,
        help_text="Horas contratuais base por mês (ex.: 176).",
    )

    class Meta:
        db_table = "recursos_humanos_funcionario"  # Nome legado
        verbose_name = "Funcionário"
        verbose_name_plural = "Funcionários"
        ordering = ["name"]  # Ordenação padrão
        indexes = [  # Índices para buscas frequentes
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "role"]),
            models.Index(fields=["tenant", "nuit"]),
            models.Index(fields=["tenant", "document_number"]),
        ]

    @property
    def current_salary(self) -> Decimal:
        """Salário nominal + aumento salarial."""
        base = self.nominal_salary or Decimal("0.00")
        aumento = self.salary_increase or Decimal("0.00")
        try:
            return (Decimal(base) + Decimal(aumento)).quantize(Decimal("0.01"))
        except Exception:
            return Decimal("0.00")

    def clean(self):
        super().clean()

        if self.nominal_salary is not None and self.nominal_salary < Decimal("0.00"):
            raise ValidationError({"nominal_salary": "Salário nominal inválido."})

        if self.salary_increase is not None and self.salary_increase < Decimal("0.00"):
            raise ValidationError({"salary_increase": "Aumento salarial inválido."})

        if self.role_id and self.tenant_id and self.role.tenant_id != self.tenant_id:
            raise ValidationError({"role": "Cargo e funcionário devem pertencer ao mesmo tenant."})
