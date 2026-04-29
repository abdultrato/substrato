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

    profession = models.ForeignKey(
        "recursos_humanos.Profession",
        db_column="profession_id",
        verbose_name="Profissão",
        on_delete=models.PROTECT,
        related_name="funcionarios",
        null=True,
        blank=True,
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
    ordinary_hour_value = models.DecimalField(
        db_column="ordinary_hour_value",
        verbose_name="Valor da Hora Ordinária",
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    extraordinary_hour_value = models.DecimalField(
        db_column="extraordinary_hour_value",
        verbose_name="Valor da Hora Extraordinária",
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
    )
    minimum_progression_months = models.PositiveSmallIntegerField(
        db_column="minimum_progression_months",
        verbose_name="Período mínimo de progressão (meses)",
        default=12,
    )
    minimum_career_change_months = models.PositiveSmallIntegerField(
        db_column="minimum_career_change_months",
        verbose_name="Período mínimo de mudança de carreira (meses)",
        default=24,
    )
    family_allowance_per_dependent = MoneyField(
        db_column="family_allowance_per_dependent",
        verbose_name="Aumento por agregado familiar",
        default=Decimal("0.00"),
    )

    class Meta:
        db_table = "recursos_humanos_funcionario"  # Nome legado
        verbose_name = "Funcionário"
        verbose_name_plural = "Funcionários"
        ordering = ["name"]  # Ordenação padrão
        indexes = [  # Índices para buscas frequentes
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "role"]),
            models.Index(fields=["tenant", "profession"]),
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

    @property
    def tenure_months(self) -> int:
        """Meses completos desde a admissão."""
        if not self.admission_date:
            return 0
        today = timezone.localdate()
        months = (today.year - self.admission_date.year) * 12 + (today.month - self.admission_date.month)
        if today.day < self.admission_date.day:
            months -= 1
        return max(months, 0)

    @property
    def has_open_disciplinary_process(self) -> bool:
        if not self.pk:
            return False
        return self.processos_disciplinares.filter(status="ABERTO", deleted=False).exists()

    @property
    def can_progress_salary(self) -> bool:
        if self.has_open_disciplinary_process:
            return False
        return self.tenure_months >= int(self.minimum_progression_months or 0)

    @property
    def can_change_career(self) -> bool:
        if self.has_open_disciplinary_process:
            return False
        return self.tenure_months >= int(self.minimum_career_change_months or 0)

    def _sync_from_profession(self, *, force: bool = False) -> set[str]:
        changed_fields: set[str] = set()
        if not self.profession_id:
            return changed_fields

        profession = self.profession
        if profession is None:
            return changed_fields

        def _assign(field_name: str, new_value):
            current_value = getattr(self, field_name, None)
            if current_value != new_value:
                setattr(self, field_name, new_value)
                changed_fields.add(field_name)

        if Decimal(self.nominal_salary or Decimal("0.00")) <= Decimal("0.00"):
            _assign("nominal_salary", profession.base_salary)

        if Decimal(self.ordinary_hour_value or Decimal("0.0000")) <= Decimal("0.0000"):
            _assign("ordinary_hour_value", profession.ordinary_hour_value)

        if Decimal(self.extraordinary_hour_value or Decimal("0.0000")) <= Decimal("0.0000"):
            _assign("extraordinary_hour_value", profession.extraordinary_hour_value)

        if force or int(self.minimum_progression_months or 0) <= 0:
            _assign("minimum_progression_months", profession.minimum_progression_months)

        if force or int(self.minimum_career_change_months or 0) <= 0:
            _assign("minimum_career_change_months", profession.minimum_career_change_months)

        if force or Decimal(self.family_allowance_per_dependent or Decimal("0.00")) <= Decimal("0.00"):
            _assign("family_allowance_per_dependent", profession.family_allowance_per_dependent)

        return changed_fields

    def clean(self):
        super().clean()

        if self.nominal_salary is not None and self.nominal_salary < Decimal("0.00"):
            raise ValidationError({"nominal_salary": "Salário nominal inválido."})

        if self.salary_increase is not None and self.salary_increase < Decimal("0.00"):
            raise ValidationError({"salary_increase": "Aumento salarial inválido."})

        if self.role_id and self.tenant_id and self.role.tenant_id != self.tenant_id:
            raise ValidationError({"role": "Cargo e funcionário devem pertencer ao mesmo tenant."})

        if self.profession_id and self.tenant_id and self.profession.tenant_id != self.tenant_id:
            raise ValidationError({"profession": "Profissão e funcionário devem pertencer ao mesmo tenant."})

        if self.ordinary_hour_value is not None and self.ordinary_hour_value < Decimal("0.0000"):
            raise ValidationError({"ordinary_hour_value": "Valor da hora ordinária inválido."})

        if self.extraordinary_hour_value is not None and self.extraordinary_hour_value < Decimal("0.0000"):
            raise ValidationError({"extraordinary_hour_value": "Valor da hora extraordinária inválido."})

        if self.minimum_progression_months <= 0:
            raise ValidationError({"minimum_progression_months": "Período mínimo de progressão deve ser > 0."})

        if self.minimum_career_change_months <= 0:
            raise ValidationError(
                {"minimum_career_change_months": "Período mínimo de mudança de carreira deve ser > 0."}
            )

        if self.family_allowance_per_dependent is not None and self.family_allowance_per_dependent < Decimal("0.00"):
            raise ValidationError({"family_allowance_per_dependent": "Aumento por agregado familiar inválido."})

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        normalized_update_fields = set(update_fields) if update_fields is not None else None

        force_sync = False
        if self.profession_id:
            if self.pk:
                previous_profession_id = (
                    type(self).all_objects.filter(pk=self.pk).values_list("profession_id", flat=True).first()
                )
                force_sync = previous_profession_id != self.profession_id
            else:
                force_sync = True

            changed_fields = self._sync_from_profession(force=force_sync)
            if normalized_update_fields is not None and changed_fields:
                normalized_update_fields.update(changed_fields)

        if normalized_update_fields is not None:
            kwargs["update_fields"] = list(normalized_update_fields)

        return super().save(*args, **kwargs)
