from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from core.models.base import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class Employee(CoreModel):
    """Funcionário da instituição — centro do módulo de RH."""

    prefix = "FUN"

    class Status(models.TextChoices):
        ACTIVE = "ATIVO", "Ativo"
        ON_LEAVE = "DE_LICENCA", "De licença"
        SUSPENDED = "SUSPENSO", "Suspenso"
        INACTIVE = "INATIVO", "Inativo"
        TERMINATED = "DESLIGADO", "Desligado"
        RETIRED = "REFORMADO", "Reformado"
        DECEASED = "FALECIDO", "Falecido"

    class Gender(models.TextChoices):
        MALE = "M", "Masculino"
        FEMALE = "F", "Feminino"
        OTHER = "OUTRO", "Outro"

    class DocumentType(models.TextChoices):
        BI = "BI", "Bilhete de Identidade"
        PASSPORT = "PASSAPORTE", "Passaporte"
        RESIDENCE = "RESIDENCIA", "Autorização de Residência"
        OTHER = "OUTRO", "Outro"

    class MaritalStatus(models.TextChoices):
        SINGLE = "SOLTEIRO", "Solteiro(a)"
        MARRIED = "CASADO", "Casado(a)"
        DIVORCED = "DIVORCIADO", "Divorciado(a)"
        WIDOWED = "VIUVO", "Viúvo(a)"
        UNION = "UNIAO_FACTO", "União de facto"
        OTHER = "OUTRO", "Outro"

    class PaymentMethod(models.TextChoices):
        BANK = "BANCO", "Transferência bancária"
        CASH = "DINHEIRO", "Dinheiro"
        CHEQUE = "CHEQUE", "Cheque"
        OTHER = "OUTRO", "Outro"

    # ── Vínculo organizacional ───────────────────────────────────────────────
    role = models.ForeignKey(
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

    # ── Dados pessoais ───────────────────────────────────────────────────────
    gender = models.CharField(
        db_column="gender",
        verbose_name="Género",
        max_length=10,
        choices=Gender.choices,
        blank=True,
        default="",
        db_index=True,
    )
    date_of_birth = models.DateField(
        db_column="date_of_birth",
        verbose_name="Data de nascimento",
        null=True,
        blank=True,
    )
    nationality = models.CharField(
        db_column="nationality",
        verbose_name="Nacionalidade",
        max_length=80,
        blank=True,
        default="",
    )
    marital_status = models.CharField(
        db_column="marital_status",
        verbose_name="Estado civil",
        max_length=20,
        choices=MaritalStatus.choices,
        blank=True,
        default="",
    )
    address = models.TextField(
        db_column="address",
        verbose_name="Morada",
        blank=True,
        default="",
    )

    # ── Documentos ───────────────────────────────────────────────────────────
    document_type = models.CharField(
        db_column="document_type",
        verbose_name="Tipo de documento",
        max_length=20,
        choices=DocumentType.choices,
        blank=True,
        default="",
    )
    document_number = models.CharField(
        db_column="document_number",
        verbose_name="Número do documento",
        max_length=60,
        blank=True,
        default="",
        db_index=True,
    )
    nuit = models.CharField(
        verbose_name="NUIT",
        max_length=30,
        blank=True,
        default="",
        db_index=True,
    )
    inss_number = models.CharField(
        db_column="inss_number",
        verbose_name="Número INSS",
        max_length=30,
        blank=True,
        default="",
        db_index=True,
    )

    # ── Contacto ─────────────────────────────────────────────────────────────
    email = models.EmailField(verbose_name="E-mail", blank=True, default="")
    phone = models.CharField(
        db_column="phone",
        verbose_name="Telefone",
        max_length=30,
        blank=True,
        default="",
    )
    emergency_contact_name = models.CharField(
        db_column="emergency_contact_name",
        verbose_name="Contacto de emergência (nome)",
        max_length=120,
        blank=True,
        default="",
    )
    emergency_contact_phone = models.CharField(
        db_column="emergency_contact_phone",
        verbose_name="Contacto de emergência (telefone)",
        max_length=30,
        blank=True,
        default="",
    )

    # ── Dados laborais ───────────────────────────────────────────────────────
    admission_date = models.DateField(
        db_column="admission_date",
        verbose_name="Data de admissão",
        default=timezone.now,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=15,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    is_medical_doctor = models.BooleanField(
        db_column="is_medical_doctor",
        verbose_name="É médico",
        default=False,
        db_index=True,
    )
    is_surgeon = models.BooleanField(
        db_column="is_surgeon",
        verbose_name="É cirurgião",
        default=False,
        db_index=True,
    )
    medical_specialty = models.ForeignKey(
        "consultas.ConsultationSpecialty",
        db_column="medical_specialty_id",
        verbose_name="Especialidade médica",
        on_delete=models.PROTECT,
        related_name="medical_staff",
        null=True,
        blank=True,
        db_index=True,
    )

    # ── Pagamento ────────────────────────────────────────────────────────────
    nib = models.CharField(
        verbose_name="NIB / Conta bancária",
        max_length=60,
        blank=True,
        default="",
    )
    payment_method = models.CharField(
        db_column="payment_method",
        verbose_name="Método de pagamento",
        max_length=10,
        choices=PaymentMethod.choices,
        default=PaymentMethod.BANK,
    )

    # ── Remuneração ──────────────────────────────────────────────────────────
    nominal_salary = MoneyField(
        db_column="nominal_salary",
        verbose_name="Salário nominal",
        default=Decimal("0.00"),
    )
    salary_increase = MoneyField(
        db_column="salary_increase",
        verbose_name="Aumento salarial",
        default=Decimal("0.00"),
        help_text="Valor adicional por promoção/aumento (somado ao salário nominal).",
    )
    base_month_hours = models.PositiveSmallIntegerField(
        db_column="base_month_hours",
        verbose_name="Horas base (mês)",
        default=176,
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
        verbose_name="Subsídio por agregado familiar",
        default=Decimal("0.00"),
    )

    class Meta:
        db_table = "recursos_humanos_funcionario"
        verbose_name = "Funcionário"
        verbose_name_plural = "Funcionários"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "role"]),
            models.Index(fields=["tenant", "profession"]),
            models.Index(fields=["tenant", "is_medical_doctor"]),
            models.Index(fields=["tenant", "is_surgeon"]),
            models.Index(fields=["tenant", "medical_specialty"]),
            models.Index(fields=["tenant", "nuit"]),
            models.Index(fields=["tenant", "document_number"]),
            models.Index(fields=["tenant", "inss_number"]),
            models.Index(fields=["tenant", "gender"]),
        ]

    # ── Properties ───────────────────────────────────────────────────────────

    @property
    def current_salary(self) -> Decimal:
        base = self.nominal_salary or Decimal("0.00")
        aumento = self.salary_increase or Decimal("0.00")
        try:
            return (Decimal(base) + Decimal(aumento)).quantize(Decimal("0.01"))
        except Exception:
            return Decimal("0.00")

    @property
    def salary_base(self) -> Decimal:
        return Decimal(self.nominal_salary or Decimal("0.00")).quantize(Decimal("0.01"))

    def _latest_payroll(self):
        if not self.pk:
            return None
        return (
            self.folhas_payment.filter(deleted=False)
            .order_by("-year", "-month", "-created_at")
            .first()
        )

    def _family_allowance_value(self) -> Decimal:
        if not self.pk:
            return Decimal("0.00")
        dependents_count = self.agregados_familiares.filter(deleted=False).count()
        return (
            Decimal(dependents_count)
            * Decimal(self.family_allowance_per_dependent or Decimal("0.00"))
        ).quantize(Decimal("0.01"))

    def _tenure_increase_value(self) -> Decimal:
        progression_window = int(self.minimum_progression_months or 0) or 12
        tenure_cycles = int(self.tenure_months // progression_window)
        return (
            Decimal(tenure_cycles)
            * Decimal(self.salary_increase or Decimal("0.00"))
        ).quantize(Decimal("0.01"))

    def _resolve_ordinary_hour_value(self) -> Decimal:
        configured_value = Decimal(self.ordinary_hour_value or Decimal("0.0000"))
        if configured_value > Decimal("0.0000"):
            return configured_value
        if self.base_month_hours:
            return (self.salary_base / Decimal(self.base_month_hours)).quantize(Decimal("0.0000"))
        return Decimal("0.0000")

    def _resolve_extraordinary_hour_value(self, ordinary_hour_value: Decimal) -> Decimal:
        configured_value = Decimal(self.extraordinary_hour_value or Decimal("0.0000"))
        if configured_value > Decimal("0.0000"):
            return configured_value
        return (Decimal(ordinary_hour_value) * Decimal("1.50")).quantize(Decimal("0.0000"))

    def _current_month_overtime_value(self) -> Decimal:
        if not self.pk or not self.tenant_id:
            return Decimal("0.00")
        from .overtime import Overtime
        today = timezone.localdate()
        rows = (
            Overtime.objects.filter(
                tenant=self.tenant,
                employee=self,
                date__year=today.year,
                date__month=today.month,
                deleted=False,
            )
            .values("kind")
            .annotate(total=Sum("hours"))
        )
        ordinary_hours = Decimal("0.00")
        extraordinary_hours = Decimal("0.00")
        for row in rows:
            hours = Decimal(row.get("total") or Decimal("0.00"))
            if row.get("kind") == Overtime.Kind.ORDINARY:
                ordinary_hours += hours
            else:
                extraordinary_hours += hours
        ordinary_hour_value = self._resolve_ordinary_hour_value()
        extraordinary_hour_value = self._resolve_extraordinary_hour_value(ordinary_hour_value)
        return (
            (ordinary_hours * ordinary_hour_value)
            + (extraordinary_hours * extraordinary_hour_value)
        ).quantize(Decimal("0.01"))

    @property
    def salary_allowances_value(self) -> Decimal:
        return (
            Decimal(self.salary_increase or Decimal("0.00"))
            + self._tenure_increase_value()
            + self._family_allowance_value()
            + self._current_month_overtime_value()
        ).quantize(Decimal("0.01"))

    @property
    def salary_liquido(self) -> Decimal:
        payroll = self._latest_payroll()
        if payroll:
            return Decimal(payroll.salary_liquido or Decimal("0.00")).quantize(Decimal("0.01"))
        return (self.salary_base + self.salary_allowances_value).quantize(Decimal("0.01"))

    @property
    def tenure_months(self) -> int:
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
        if self.medical_specialty_id and self.tenant_id and self.medical_specialty.tenant_id != self.tenant_id:
            raise ValidationError({"medical_specialty": "Especialidade médica e funcionário devem pertencer ao mesmo tenant."})
        if self.is_surgeon and not self.is_medical_doctor:
            raise ValidationError({"is_surgeon": "Um cirurgião deve estar marcado também como médico."})
        if self.medical_specialty_id and not self.is_medical_doctor:
            raise ValidationError({"medical_specialty": "A especialidade médica só pode ser atribuída a funcionário marcado como médico."})
        if self.ordinary_hour_value is not None and self.ordinary_hour_value < Decimal("0.0000"):
            raise ValidationError({"ordinary_hour_value": "Valor da hora ordinária inválido."})
        if self.extraordinary_hour_value is not None and self.extraordinary_hour_value < Decimal("0.0000"):
            raise ValidationError({"extraordinary_hour_value": "Valor da hora extraordinária inválido."})
        if self.minimum_progression_months <= 0:
            raise ValidationError({"minimum_progression_months": "Período mínimo de progressão deve ser > 0."})
        if self.minimum_career_change_months <= 0:
            raise ValidationError({"minimum_career_change_months": "Período mínimo de mudança de carreira deve ser > 0."})
        if self.family_allowance_per_dependent is not None and self.family_allowance_per_dependent < Decimal("0.00"):
            raise ValidationError({"family_allowance_per_dependent": "Subsídio por agregado familiar inválido."})

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
