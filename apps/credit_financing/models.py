from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel, NoNameCoreModel

ZERO = Decimal("0.00")
MONEY_VALIDATORS = [MinValueValidator(ZERO)]
PERCENT_VALIDATORS = [MinValueValidator(ZERO), MaxValueValidator(Decimal("100.00"))]


class HealthConsortium(CoreModel):
    class ConsortiumType(models.TextChoices):
        HEALTH_PLAN = "HEALTH_PLAN", "Plano de saúde"
        DENTAL_PLAN = "DENTAL_PLAN", "Plano odontológico"
        PROCEDURE_PACKAGE = "PROCEDURE_PACKAGE", "Pacote de procedimentos"
        FAMILY_GROUP = "FAMILY_GROUP", "Grupo familiar"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ACTIVE = "ACTIVE", "Ativo"
        AWARDED = "AWARDED", "Contemplado"
        COMPLETED = "COMPLETED", "Concluído"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "HCO"

    consortium_type = models.CharField("Tipo de consórcio", max_length=24, choices=ConsortiumType.choices, db_index=True)
    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente/beneficiário",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="health_consortiums",
        db_index=True,
    )
    sponsor_company = models.ForeignKey(
        "entidades.Company",
        verbose_name="Empresa patrocinadora",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="health_consortiums",
        db_index=True,
    )
    invoice = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura relacionada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="health_consortiums",
    )
    quota_number = models.CharField("Quota", max_length=40, blank=True, default="", db_index=True)
    target_amount = models.DecimalField("Valor alvo", max_digits=12, decimal_places=2, validators=MONEY_VALIDATORS)
    contribution_amount = models.DecimalField("Prestação mensal", max_digits=12, decimal_places=2, validators=MONEY_VALIDATORS)
    admin_fee_percent = models.DecimalField(
        "Taxa administrativa (%)",
        max_digits=5,
        decimal_places=2,
        default=ZERO,
        validators=PERCENT_VALIDATORS,
    )
    term_months = models.PositiveSmallIntegerField("Prazo (meses)", default=12, validators=[MinValueValidator(1)])
    start_date = models.DateField("Início", default=timezone.localdate, db_index=True)
    expected_award_date = models.DateField("Previsão de contemplação", null=True, blank=True, db_index=True)
    awarded_at = models.DateField("Contemplado em", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    covered_services = models.TextField("Serviços cobertos", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "creditos_financiamento_consorcio_saude"
        verbose_name = "Consórcio de Saúde"
        verbose_name_plural = "Consórcios de Saúde"
        ordering = ["-start_date", "name"]
        indexes = [
            models.Index(fields=["tenant", "consortium_type", "status"]),
            models.Index(fields=["tenant", "patient", "start_date"]),
            models.Index(fields=["tenant", "sponsor_company", "start_date"]),
            models.Index(fields=["tenant", "quota_number"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "quota_number"],
                condition=models.Q(quota_number__gt="", deleted=False),
                name="uq_health_consortium_quota_tenant",
            ),
        ]

    @property
    def expected_total_contribution(self) -> Decimal:
        return _money(self.contribution_amount * Decimal(self.term_months))

    @property
    def admin_fee_amount(self) -> Decimal:
        return _money(self.target_amount * (self.admin_fee_percent / Decimal("100.00")))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "sponsor_company")
        _validate_same_tenant(self, "invoice")
        if not self.patient_id and not self.sponsor_company_id:
            raise ValidationError("Informe o beneficiário ou a empresa patrocinadora do consórcio.")
        if self.contribution_amount <= ZERO:
            raise ValidationError({"contribution_amount": "A prestação mensal deve ser maior que zero."})
        if self.target_amount <= ZERO:
            raise ValidationError({"target_amount": "O valor alvo deve ser maior que zero."})
        if self.expected_award_date and self.expected_award_date < self.start_date:
            raise ValidationError({"expected_award_date": "A contemplação prevista não pode ser anterior ao início."})
        if self.awarded_at and self.awarded_at < self.start_date:
            raise ValidationError({"awarded_at": "A data de contemplação não pode ser anterior ao início."})
        if self.status == self.Status.AWARDED and not self.awarded_at:
            raise ValidationError({"awarded_at": "Consórcio contemplado exige data de contemplação."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if not self.tenant_id:
            _propagate_tenant_from(self, "sponsor_company")
        if not self.tenant_id:
            _propagate_tenant_from(self, "invoice")
        if not self.name and self.patient_id:
            self.name = f"Consórcio {self.patient.name}"
        if not self.name and self.sponsor_company_id:
            self.name = f"Consórcio {self.sponsor_company.name}"
        self.full_clean()
        return super().save(*args, **kwargs)


class ElectiveProcedureFinancing(NoNameCoreModel):
    class Status(models.TextChoices):
        APPLICATION = "APPLICATION", "Em análise"
        APPROVED = "APPROVED", "Aprovado"
        ACTIVE = "ACTIVE", "Ativo"
        PAID = "PAID", "Liquidado"
        DEFAULTED = "DEFAULTED", "Em incumprimento"
        CANCELLED = "CANCELLED", "Cancelado"

    class RiskRating(models.TextChoices):
        LOW = "LOW", "Baixo"
        MEDIUM = "MEDIUM", "Médio"
        HIGH = "HIGH", "Alto"

    prefix = "EPF"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="procedure_financings",
        db_index=True,
    )
    invoice = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedure_financings",
        db_index=True,
    )
    financier_company = models.ForeignKey(
        "entidades.Company",
        verbose_name="Entidade financiadora",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedure_financings",
    )
    procedure_description = models.CharField("Procedimento eletivo", max_length=180)
    contract_number = models.CharField("Contrato", max_length=60, blank=True, default="", db_index=True)
    approval_reference = models.CharField("Referência de aprovação", max_length=80, blank=True, default="", db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.APPLICATION, db_index=True)
    risk_rating = models.CharField("Risco", max_length=12, choices=RiskRating.choices, default=RiskRating.MEDIUM, db_index=True)
    principal_amount = models.DecimalField("Valor do procedimento", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    down_payment = models.DecimalField("Entrada", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    financed_amount = models.DecimalField("Valor financiado", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    annual_interest_rate = models.DecimalField(
        "Juro anual (%)",
        max_digits=5,
        decimal_places=2,
        default=ZERO,
        validators=PERCENT_VALIDATORS,
    )
    term_months = models.PositiveSmallIntegerField("Prazo (meses)", default=6, validators=[MinValueValidator(1)])
    installment_amount = models.DecimalField("Parcela calculada", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    start_date = models.DateField("Início", default=timezone.localdate, db_index=True)
    first_due_date = models.DateField("Primeiro vencimento", null=True, blank=True, db_index=True)
    collateral_notes = models.TextField("Garantias/observações de risco", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "creditos_financiamento_procedimento"
        verbose_name = "Financiamento de Procedimento"
        verbose_name_plural = "Financiamentos de Procedimentos"
        ordering = ["-start_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "start_date"]),
            models.Index(fields=["tenant", "status", "risk_rating"]),
            models.Index(fields=["tenant", "contract_number"]),
            models.Index(fields=["tenant", "invoice"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "contract_number"],
                condition=models.Q(contract_number__gt="", deleted=False),
                name="uq_procedure_financing_contract_tenant",
            ),
        ]

    @property
    def total_scheduled_amount(self) -> Decimal:
        return _money(self.installment_amount * Decimal(self.term_months))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "invoice")
        _validate_same_tenant(self, "financier_company")
        if self.invoice_id and self.invoice.patient_id and self.invoice.patient_id != self.patient_id:
            raise ValidationError({"invoice": "A fatura deve pertencer ao paciente financiado."})
        if self.principal_amount <= ZERO:
            raise ValidationError({"principal_amount": "O valor do procedimento deve ser maior que zero."})
        if self.down_payment > self.principal_amount:
            raise ValidationError({"down_payment": "A entrada não pode exceder o valor do procedimento."})
        if self.financed_amount <= ZERO:
            raise ValidationError({"financed_amount": "O valor financiado deve ser maior que zero."})
        if self.first_due_date and self.first_due_date < self.start_date:
            raise ValidationError({"first_due_date": "O primeiro vencimento não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.invoice_id and self.principal_amount == ZERO:
            self.principal_amount = _money(self.invoice.patient_amount or self.invoice.total or ZERO)
        self.financed_amount = _money(max(self.principal_amount - self.down_payment, ZERO))
        self.installment_amount = calculate_installment(self.financed_amount, self.annual_interest_rate, self.term_months)
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.contract_number or self.custom_id or f"Financiamento {self.pk}"


class CreditInstallment(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        PARTIAL = "PARTIAL", "Parcial"
        PAID = "PAID", "Paga"
        OVERDUE = "OVERDUE", "Vencida"
        WAIVED = "WAIVED", "Perdoada"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "CIN"

    procedure_financing = models.ForeignKey(
        ElectiveProcedureFinancing,
        verbose_name="Financiamento de procedimento",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="installments",
        db_index=True,
    )
    student_funding = models.ForeignKey(
        "creditos_financiamento.StudentFunding",
        verbose_name="Financiamento estudantil",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="installments",
        db_index=True,
    )
    invoice = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_installments",
    )
    payment = models.ForeignKey(
        "pagamentos.Payment",
        verbose_name="Pagamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_installments",
    )
    installment_number = models.PositiveSmallIntegerField("N.º da parcela", default=1, validators=[MinValueValidator(1)])
    due_date = models.DateField("Vencimento", db_index=True)
    principal_amount = models.DecimalField("Capital", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    interest_amount = models.DecimalField("Juro", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    fee_amount = models.DecimalField("Taxas", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    total_amount = models.DecimalField("Total", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    paid_amount = models.DecimalField("Pago", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    paid_at = models.DateTimeField("Pago em", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "creditos_financiamento_parcela"
        verbose_name = "Parcela de Crédito"
        verbose_name_plural = "Parcelas de Crédito"
        ordering = ["due_date", "installment_number", "id"]
        indexes = [
            models.Index(fields=["tenant", "due_date", "status"]),
            models.Index(fields=["tenant", "procedure_financing", "installment_number"]),
            models.Index(fields=["tenant", "student_funding", "installment_number"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["procedure_financing", "installment_number"],
                condition=models.Q(procedure_financing__isnull=False, deleted=False),
                name="uq_procedure_financing_installment_number",
            ),
            models.UniqueConstraint(
                fields=["student_funding", "installment_number"],
                condition=models.Q(student_funding__isnull=False, deleted=False),
                name="uq_student_funding_installment_number",
            ),
        ]

    @property
    def balance_due(self) -> Decimal:
        return _money(max((self.total_amount or ZERO) - (self.paid_amount or ZERO), ZERO))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "procedure_financing")
        _validate_same_tenant(self, "student_funding")
        _validate_same_tenant(self, "invoice")
        _validate_same_tenant(self, "payment")
        owners = int(bool(self.procedure_financing_id)) + int(bool(self.student_funding_id))
        if owners != 1:
            raise ValidationError("A parcela deve pertencer a exatamente um financiamento.")
        if self.paid_amount > self.total_amount:
            raise ValidationError({"paid_amount": "O valor pago não pode exceder o total da parcela."})
        if self.status == self.Status.PAID and not self.paid_at:
            raise ValidationError({"paid_at": "Parcela paga exige data de pagamento."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "procedure_financing")
        if not self.tenant_id:
            _propagate_tenant_from(self, "student_funding")
        if not self.invoice_id and self.procedure_financing_id:
            self.invoice_id = self.procedure_financing.invoice_id
        if self.total_amount == ZERO:
            self.total_amount = _money(self.principal_amount + self.interest_amount + self.fee_amount)
        if self.paid_amount >= self.total_amount and self.total_amount > ZERO:
            self.status = self.Status.PAID
            if not self.paid_at:
                self.paid_at = timezone.now()
        elif self.paid_amount > ZERO:
            self.status = self.Status.PARTIAL
        elif self.status == self.Status.SCHEDULED and self.due_date < timezone.localdate():
            self.status = self.Status.OVERDUE
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.custom_id or self.pk} - {self.installment_number}/{self.total_amount}"


class ReimbursementClaim(NoNameCoreModel):
    class ClaimType(models.TextChoices):
        AGREEMENT = "AGREEMENT", "Convênio"
        INSURANCE = "INSURANCE", "Seguro"
        PUBLIC = "PUBLIC", "Programa público"
        PRIVATE = "PRIVATE", "Reembolso privado"

    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submetido"
        UNDER_REVIEW = "UNDER_REVIEW", "Em análise"
        APPROVED = "APPROVED", "Aprovado"
        GLOSSED = "GLOSSED", "Glosado"
        APPEALED = "APPEALED", "Recurso submetido"
        PAID = "PAID", "Reembolsado"
        REJECTED = "REJECTED", "Rejeitado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "RCL"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reimbursement_claims",
        db_index=True,
    )
    invoice = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reimbursement_claims",
        db_index=True,
    )
    payer_company = models.ForeignKey(
        "entidades.Company",
        verbose_name="Convênio/seguradora",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reimbursement_claims",
        db_index=True,
    )
    claim_type = models.CharField("Tipo de pedido", max_length=16, choices=ClaimType.choices, default=ClaimType.AGREEMENT, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.SUBMITTED, db_index=True)
    administrative_reference = models.CharField("Referência administrativa", max_length=80, blank=True, default="", db_index=True)
    submitted_at = models.DateTimeField("Submetido em", default=timezone.now, db_index=True)
    response_due_date = models.DateField("Prazo de resposta", null=True, blank=True, db_index=True)
    decision_at = models.DateTimeField("Decisão em", null=True, blank=True, db_index=True)
    claimed_amount = models.DecimalField("Valor reclamado", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    approved_amount = models.DecimalField("Valor aprovado", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    denied_amount = models.DecimalField("Valor glosado", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    reimbursed_amount = models.DecimalField("Valor reembolsado", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    glosa_reason = models.TextField("Motivo da glosa", blank=True, default="")
    appeal_submitted_at = models.DateTimeField("Recurso submetido em", null=True, blank=True, db_index=True)
    appeal_notes = models.TextField("Recurso administrativo", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "creditos_financiamento_reembolso"
        verbose_name = "Convênio e Reembolso"
        verbose_name_plural = "Convênios e Reembolsos"
        ordering = ["-submitted_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "claim_type"]),
            models.Index(fields=["tenant", "payer_company", "submitted_at"]),
            models.Index(fields=["tenant", "patient", "submitted_at"]),
            models.Index(fields=["tenant", "administrative_reference"]),
        ]

    @property
    def balance_to_receive(self) -> Decimal:
        return _money(max((self.approved_amount or ZERO) - (self.reimbursed_amount or ZERO), ZERO))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "invoice")
        _validate_same_tenant(self, "payer_company")
        if self.invoice_id and self.patient_id and self.invoice.patient_id and self.invoice.patient_id != self.patient_id:
            raise ValidationError({"invoice": "A fatura deve pertencer ao paciente informado."})
        if self.approved_amount > self.claimed_amount:
            raise ValidationError({"approved_amount": "O valor aprovado não pode exceder o valor reclamado."})
        if self.reimbursed_amount > self.approved_amount:
            raise ValidationError({"reimbursed_amount": "O reembolso não pode exceder o valor aprovado."})
        if self.status == self.Status.GLOSSED and not self.glosa_reason:
            raise ValidationError({"glosa_reason": "Pedidos glosados exigem motivo da glosa."})
        if self.status == self.Status.APPEALED and not (self.appeal_notes or self.appeal_submitted_at):
            raise ValidationError({"appeal_notes": "Recursos administrativos exigem notas ou data de submissão."})

    def save(self, *args, **kwargs):
        if self.invoice_id and not self.patient_id:
            self.patient_id = self.invoice.patient_id
        _propagate_tenant_from(self, "patient")
        if not self.tenant_id:
            _propagate_tenant_from(self, "invoice")
        if self.invoice_id and self.claimed_amount == ZERO:
            self.claimed_amount = _money(self.invoice.insurance_amount or self.invoice.total or ZERO)
        self.denied_amount = _money(max((self.claimed_amount or ZERO) - (self.approved_amount or ZERO), ZERO))
        if self.denied_amount > ZERO and self.status in {self.Status.APPROVED, self.Status.UNDER_REVIEW, self.Status.SUBMITTED}:
            self.status = self.Status.GLOSSED
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.administrative_reference or self.custom_id or f"Reembolso {self.pk}"


class StudentFunding(NoNameCoreModel):
    class FundingType(models.TextChoices):
        SCHOLARSHIP = "SCHOLARSHIP", "Bolsa"
        STUDENT_LOAN = "STUDENT_LOAN", "Financiamento estudantil"
        INSTALLMENT_PLAN = "INSTALLMENT_PLAN", "Parcelamento académico"
        GRANT = "GRANT", "Subsídio"
        DISCOUNT = "DISCOUNT", "Desconto"

    class Status(models.TextChoices):
        APPLICATION = "APPLICATION", "Em análise"
        APPROVED = "APPROVED", "Aprovado"
        ACTIVE = "ACTIVE", "Ativo"
        SUSPENDED = "SUSPENDED", "Suspenso"
        COMPLETED = "COMPLETED", "Concluído"
        DEFAULTED = "DEFAULTED", "Em incumprimento"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "SFD"

    student = models.ForeignKey(
        "education.StudentProfile",
        verbose_name="Estudante",
        on_delete=models.PROTECT,
        related_name="funding_records",
        db_index=True,
    )
    enrollment = models.ForeignKey(
        "education.Enrollment",
        verbose_name="Matrícula",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="funding_records",
        db_index=True,
    )
    course = models.ForeignKey(
        "education.Course",
        verbose_name="Curso",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_funding_records",
        db_index=True,
    )
    sponsor_company = models.ForeignKey(
        "entidades.Company",
        verbose_name="Patrocinador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_funding_records",
    )
    funding_type = models.CharField("Tipo de apoio", max_length=20, choices=FundingType.choices, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.APPLICATION, db_index=True)
    academic_year = models.CharField("Ano académico", max_length=16, blank=True, default="", db_index=True)
    application_reference = models.CharField("Referência da candidatura", max_length=80, blank=True, default="", db_index=True)
    approval_reference = models.CharField("Referência de aprovação", max_length=80, blank=True, default="", db_index=True)
    coverage_percent = models.DecimalField("Cobertura (%)", max_digits=5, decimal_places=2, default=ZERO, validators=PERCENT_VALIDATORS)
    tuition_amount = models.DecimalField("Propina/encargo", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    approved_amount = models.DecimalField("Valor aprovado", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    financed_amount = models.DecimalField("Valor financiado", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    annual_interest_rate = models.DecimalField("Juro anual (%)", max_digits=5, decimal_places=2, default=ZERO, validators=PERCENT_VALIDATORS)
    term_months = models.PositiveSmallIntegerField("Prazo (meses)", default=1, validators=[MinValueValidator(1)])
    monthly_installment = models.DecimalField("Parcela mensal", max_digits=12, decimal_places=2, default=ZERO, validators=MONEY_VALIDATORS)
    start_date = models.DateField("Início", default=timezone.localdate, db_index=True)
    end_date = models.DateField("Fim", null=True, blank=True, db_index=True)
    conditions = models.TextField("Condições", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "creditos_financiamento_estudantil"
        verbose_name = "Bolsa e Financiamento Estudantil"
        verbose_name_plural = "Bolsas e Financiamentos Estudantis"
        ordering = ["-start_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "student", "academic_year"]),
            models.Index(fields=["tenant", "funding_type", "status"]),
            models.Index(fields=["tenant", "course", "academic_year"]),
            models.Index(fields=["tenant", "sponsor_company"]),
        ]

    @property
    def unfunded_amount(self) -> Decimal:
        return _money(max((self.tuition_amount or ZERO) - (self.approved_amount or ZERO), ZERO))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "student")
        _validate_same_tenant(self, "enrollment")
        _validate_same_tenant(self, "course")
        _validate_same_tenant(self, "sponsor_company")
        if self.enrollment_id and self.enrollment.student_id != self.student_id:
            raise ValidationError({"enrollment": "A matrícula deve pertencer ao estudante informado."})
        if self.enrollment_id and self.course_id and self.enrollment.classroom.course_id != self.course_id:
            raise ValidationError({"course": "O curso deve corresponder à matrícula selecionada."})
        if self.approved_amount > self.tuition_amount and self.tuition_amount > ZERO:
            raise ValidationError({"approved_amount": "O valor aprovado não pode exceder o encargo académico."})
        if self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "A data final não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "student")
        if self.enrollment_id:
            if not self.course_id:
                self.course_id = self.enrollment.classroom.course_id
            if not self.academic_year:
                self.academic_year = self.enrollment.classroom.academic_year
        if self.approved_amount == ZERO and self.tuition_amount > ZERO and self.coverage_percent > ZERO:
            self.approved_amount = _money(self.tuition_amount * (self.coverage_percent / Decimal("100.00")))
        if self.funding_type in {self.FundingType.STUDENT_LOAN, self.FundingType.INSTALLMENT_PLAN}:
            self.financed_amount = self.financed_amount or self.approved_amount
            self.monthly_installment = calculate_installment(self.financed_amount, self.annual_interest_rate, self.term_months)
        else:
            self.financed_amount = ZERO
            self.monthly_installment = ZERO
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.application_reference or self.custom_id or f"Apoio estudantil {self.pk}"


def calculate_installment(principal: Decimal, annual_interest_rate: Decimal, term_months: int) -> Decimal:
    principal = _money(principal)
    if principal <= ZERO or term_months <= 0:
        return ZERO
    monthly_rate = (annual_interest_rate or ZERO) / Decimal("100.00") / Decimal("12.00")
    if monthly_rate <= ZERO:
        return _money(principal / Decimal(term_months))
    factor = (Decimal("1.00") + monthly_rate) ** Decimal(term_months)
    return _money(principal * monthly_rate * factor / (factor - Decimal("1.00")))


def _money(value: Decimal) -> Decimal:
    return Decimal(value or ZERO).quantize(Decimal("0.01"))


def _propagate_tenant_from(instance, field_name: str) -> None:
    if getattr(instance, "tenant_id", None):
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None):
        instance.tenant_id = related.tenant_id


def _validate_same_tenant(instance, field_name: str) -> None:
    related_id = getattr(instance, f"{field_name}_id", None)
    if not related_id or not getattr(instance, "tenant_id", None):
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None) != instance.tenant_id:
        raise ValidationError({field_name: "O registo relacionado deve pertencer ao mesmo tenant."})
