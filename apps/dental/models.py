from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.mixins.model.position import ScopedPositionMixin
from core.models.base import CoreModel, NoNameCoreModel


class DentalProcedure(CoreModel):
    class Category(models.TextChoices):
        PREVENTIVE = "PREVENTIVE", "Preventivo"
        RESTORATIVE = "RESTORATIVE", "Restaurador"
        ENDODONTICS = "ENDODONTICS", "Endodontia"
        PERIODONTICS = "PERIODONTICS", "Periodontia"
        SURGERY = "SURGERY", "Cirurgia oral"
        ORTHODONTICS = "ORTHODONTICS", "Ortodontia"
        PROSTHESIS = "PROSTHESIS", "Prótese"
        IMAGING = "IMAGING", "Imagem"
        OTHER = "OTHER", "Outro"

    prefix = "DPR"

    code = models.CharField("Código", max_length=32, db_index=True)
    category = models.CharField(
        "Categoria",
        max_length=20,
        choices=Category.choices,
        default=Category.RESTORATIVE,
        db_index=True,
    )
    default_duration_minutes = models.PositiveSmallIntegerField(
        "Duração padrão (minutos)",
        default=30,
        validators=[MinValueValidator(1)],
    )
    base_price = models.DecimalField(
        "Preço base",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    requires_prosthesis_lab = models.BooleanField("Requer laboratório de prótese", default=False, db_index=True)
    active = models.BooleanField("Ativo", default=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_procedimento"
        verbose_name = "Procedimento Dentário"
        verbose_name_plural = "Procedimentos Dentários"
        ordering = ["name", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_dental_procedure_code_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "category"]),
            models.Index(fields=["tenant", "active"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}" if self.code else self.name


class DentalAppointment(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        CONFIRMED = "CONFIRMED", "Confirmada"
        CHECKED_IN = "CHECKED_IN", "Presente"
        IN_PROGRESS = "IN_PROGRESS", "Em atendimento"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"
        NO_SHOW = "NO_SHOW", "Faltou"

    prefix = "DAG"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_appointments",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_appointments",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",
        verbose_name="Consulta clínica associada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_appointments",
    )
    scheduled_start = models.DateTimeField("Início agendado", db_index=True)
    scheduled_end = models.DateTimeField("Fim agendado", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    reason = models.CharField("Motivo", max_length=180, blank=True, default="")
    chair = models.CharField("Cadeira/Gabinete", max_length=60, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_agenda"
        verbose_name = "Consulta Dentária"
        verbose_name_plural = "Consultas Dentárias"
        ordering = ["-scheduled_start", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "scheduled_start"]),
            models.Index(fields=["tenant", "dentist", "scheduled_start"]),
            models.Index(fields=["tenant", "status", "scheduled_start"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "consultation")
        if self.scheduled_end and self.scheduled_start and self.scheduled_end <= self.scheduled_start:
            raise ValidationError({"scheduled_end": "O fim deve ser posterior ao início agendado."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Consulta dentária {self.pk}"


class DentalRecord(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ACTIVE = "ACTIVE", "Ativo"
        FINALIZED = "FINALIZED", "Finalizado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DRE"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_records",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_records",
        db_index=True,
    )
    appointment = models.ForeignKey(
        "odontologia.DentalAppointment",
        verbose_name="Consulta dentária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="records",
    )
    opened_at = models.DateTimeField("Abertura", default=timezone.now, db_index=True)
    closed_at = models.DateTimeField("Fecho", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    chief_complaint = models.TextField("Queixa principal", blank=True, default="")
    dental_history = models.TextField("Histórico dentário", blank=True, default="")
    diagnosis = models.TextField("Diagnóstico dentário", blank=True, default="")
    treatment_summary = models.TextField("Resumo do tratamento", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_prontuario"
        verbose_name = "Prontuário Dentário"
        verbose_name_plural = "Prontuários Dentários"
        ordering = ["-opened_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "opened_at"]),
            models.Index(fields=["tenant", "dentist", "opened_at"]),
            models.Index(fields=["tenant", "status", "opened_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "appointment")
        if self.appointment_id and self.patient_id and self.appointment.patient_id != self.patient_id:
            raise ValidationError({"appointment": "A consulta dentária deve pertencer ao mesmo paciente."})
        if self.closed_at and self.opened_at and self.closed_at < self.opened_at:
            raise ValidationError({"closed_at": "O fecho não pode ser anterior à abertura."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Prontuário dentário {self.pk}"


class DentalOdontogramEntry(NoNameCoreModel):
    class Surface(models.TextChoices):
        WHOLE = "WHOLE", "Dente inteiro"
        OCCLUSAL = "O", "Oclusal"
        MESIAL = "M", "Mesial"
        DISTAL = "D", "Distal"
        VESTIBULAR = "V", "Vestibular"
        LINGUAL = "L", "Lingual"
        PALATAL = "P", "Palatina"
        INCISAL = "I", "Incisal"
        GINGIVAL = "G", "Gengival"

    class Condition(models.TextChoices):
        HEALTHY = "HEALTHY", "Saudável"
        CARIES = "CARIES", "Cárie"
        RESTORATION = "RESTORATION", "Restauração"
        MISSING = "MISSING", "Ausente"
        CROWN = "CROWN", "Coroa"
        ROOT_CANAL = "ROOT_CANAL", "Endodontia"
        IMPLANT = "IMPLANT", "Implante"
        EXTRACTION_INDICATED = "EXTRACTION_INDICATED", "Extração indicada"
        PROSTHESIS = "PROSTHESIS", "Prótese"
        OTHER = "OTHER", "Outro"

    prefix = "ODO"

    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.CASCADE,
        related_name="odontogram_entries",
        db_index=True,
    )
    tooth_number = models.CharField("Dente", max_length=4, db_index=True)
    surface = models.CharField("Face", max_length=8, choices=Surface.choices, default=Surface.WHOLE, db_index=True)
    condition = models.CharField("Condição", max_length=24, choices=Condition.choices, default=Condition.HEALTHY)
    procedure = models.ForeignKey(
        "odontologia.DentalProcedure",
        verbose_name="Procedimento relacionado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="odontogram_entries",
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_odontograma"
        verbose_name = "Entrada do Odontograma"
        verbose_name_plural = "Entradas do Odontograma"
        ordering = ["record", "tooth_number", "surface", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "record", "tooth_number", "surface"],
                name="uq_dental_odontogram_tooth_surface_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "record"]),
            models.Index(fields=["tenant", "tooth_number"]),
            models.Index(fields=["tenant", "condition"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "record")
        _validate_same_tenant(self, "procedure")
        _validate_tooth_number(self.tooth_number)

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "record")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tooth_number} {self.surface} - {self.condition}"


class DentalTreatmentPlan(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        PROPOSED = "PROPOSED", "Proposto"
        APPROVED = "APPROVED", "Aprovado"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluído"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DTP"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_treatment_plans",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_treatment_plans",
        db_index=True,
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treatment_plans",
    )
    title = models.CharField("Título", max_length=160)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    objectives = models.TextField("Objetivos", blank=True, default="")
    planned_start = models.DateField("Início previsto", null=True, blank=True, db_index=True)
    planned_end = models.DateField("Fim previsto", null=True, blank=True, db_index=True)
    approved_at = models.DateTimeField("Aprovado em", null=True, blank=True)
    estimated_total = models.DecimalField(
        "Total estimado",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_plano_tratamento"
        verbose_name = "Plano de Tratamento Dentário"
        verbose_name_plural = "Planos de Tratamento Dentário"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "dentist", "status"]),
            models.Index(fields=["tenant", "planned_start"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "record")
        if self.record_id and self.patient_id and self.record.patient_id != self.patient_id:
            raise ValidationError({"record": "O prontuário dentário deve pertencer ao mesmo paciente."})
        if self.planned_end and self.planned_start and self.planned_end < self.planned_start:
            raise ValidationError({"planned_end": "O fim previsto não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class DentalTreatmentPlanItem(ScopedPositionMixin, NoNameCoreModel):
    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planeado"
        AUTHORIZED = "AUTHORIZED", "Autorizado"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluído"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DTI"
    position_scope_fields = ("treatment_plan",)

    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
    )
    procedure = models.ForeignKey(
        "odontologia.DentalProcedure",
        verbose_name="Procedimento",
        on_delete=models.PROTECT,
        related_name="treatment_items",
        db_index=True,
    )
    appointment = models.ForeignKey(
        "odontologia.DentalAppointment",
        verbose_name="Consulta dentária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treatment_items",
    )
    tooth_number = models.CharField("Dente", max_length=4, blank=True, default="", db_index=True)
    surface = models.CharField("Face", max_length=8, blank=True, default="")
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.PLANNED, db_index=True)
    scheduled_date = models.DateField("Data prevista", null=True, blank=True, db_index=True)
    completed_at = models.DateTimeField("Concluído em", null=True, blank=True)
    quantity = models.DecimalField(
        "Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    unit_price = models.DecimalField(
        "Preço unitário",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    lab_required = models.BooleanField("Requer laboratório", default=False, db_index=True)
    clinical_notes = models.TextField("Notas clínicas", blank=True, default="")

    class Meta:
        db_table = "odontologia_plano_tratamento_item"
        verbose_name = "Item do Plano Dentário"
        verbose_name_plural = "Itens do Plano Dentário"
        ordering = ["treatment_plan", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "treatment_plan"]),
            models.Index(fields=["tenant", "procedure"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "scheduled_date"]),
        ]

    @property
    def total_price(self) -> Decimal:
        return (self.quantity or Decimal("0.00")) * (self.unit_price or Decimal("0.00"))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "treatment_plan")
        _validate_same_tenant(self, "procedure")
        _validate_same_tenant(self, "appointment")
        if self.tooth_number:
            _validate_tooth_number(self.tooth_number)
        if (
            self.appointment_id
            and self.treatment_plan_id
            and self.appointment.patient_id != self.treatment_plan.patient_id
        ):
            raise ValidationError({"appointment": "A consulta deve pertencer ao mesmo paciente do plano."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "treatment_plan")
        if self.procedure_id:
            if not self.unit_price or self.unit_price == Decimal("0.00"):
                self.unit_price = self.procedure.base_price
            if not self.lab_required:
                self.lab_required = self.procedure.requires_prosthesis_lab
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.position}. {self.procedure}"


class DentalProsthesisLabOrder(NoNameCoreModel):
    class ProsthesisType(models.TextChoices):
        CROWN = "CROWN", "Coroa"
        BRIDGE = "BRIDGE", "Ponte"
        DENTURE = "DENTURE", "Prótese removível"
        IMPLANT = "IMPLANT", "Implante"
        ORTHODONTIC = "ORTHODONTIC", "Aparelho ortodôntico"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitado"
        SENT_TO_LAB = "SENT_TO_LAB", "Enviado ao laboratório"
        IN_PRODUCTION = "IN_PRODUCTION", "Em produção"
        RECEIVED = "RECEIVED", "Recebido"
        DELIVERED = "DELIVERED", "Entregue"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DLO"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_lab_orders",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_lab_orders",
        db_index=True,
    )
    treatment_item = models.ForeignKey(
        "odontologia.DentalTreatmentPlanItem",
        verbose_name="Item do plano",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prosthesis_lab_orders",
    )
    lab_company = models.ForeignKey(
        "entidades.Company",
        verbose_name="Laboratório de prótese",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_prosthesis_orders",
    )
    order_number = models.CharField("Número da ordem", max_length=40, blank=True, default="", db_index=True)
    prosthesis_type = models.CharField(
        "Tipo de prótese",
        max_length=20,
        choices=ProsthesisType.choices,
        default=ProsthesisType.CROWN,
        db_index=True,
    )
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    tooth_numbers = models.CharField("Dentes", max_length=80, blank=True, default="")
    shade = models.CharField("Cor/Escala", max_length=30, blank=True, default="")
    material = models.CharField("Material", max_length=80, blank=True, default="")
    impression_date = models.DateField("Data da moldagem", null=True, blank=True)
    sent_at = models.DateTimeField("Enviado em", null=True, blank=True)
    due_date = models.DateField("Previsão de entrega", null=True, blank=True, db_index=True)
    received_at = models.DateTimeField("Recebido em", null=True, blank=True)
    delivered_at = models.DateTimeField("Entregue em", null=True, blank=True)
    lab_notes = models.TextField("Notas para o laboratório", blank=True, default="")
    cost = models.DecimalField(
        "Custo laboratorial",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        db_table = "odontologia_ordem_laboratorio_protese"
        verbose_name = "Ordem de Laboratório de Prótese"
        verbose_name_plural = "Ordens de Laboratório de Prótese"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "order_number"],
                condition=~models.Q(order_number=""),
                name="uq_dental_lab_order_number_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "lab_company", "status"]),
            models.Index(fields=["tenant", "due_date"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "treatment_item")
        _validate_same_tenant(self, "lab_company")
        if (
            self.treatment_item_id
            and self.patient_id
            and self.treatment_item.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_item": "O item do plano deve pertencer ao mesmo paciente."})
        if self.received_at and self.sent_at and self.received_at < self.sent_at:
            raise ValidationError({"received_at": "A recepção não pode ser anterior ao envio."})
        if self.delivered_at and self.received_at and self.delivered_at < self.received_at:
            raise ValidationError({"delivered_at": "A entrega não pode ser anterior à recepção."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.order_number or self.custom_id or f"Ordem de prótese {self.pk}"


def _propagate_tenant_from(instance: NoNameCoreModel, field_name: str) -> None:
    if instance.tenant_id:
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None):
        instance.tenant_id = related.tenant_id


def _validate_same_tenant(instance: NoNameCoreModel, field_name: str) -> None:
    related_id = getattr(instance, f"{field_name}_id", None)
    if not related_id or not instance.tenant_id:
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None) != instance.tenant_id:
        raise ValidationError({field_name: "O registo relacionado deve pertencer ao mesmo tenant."})


def _validate_tooth_number(value: str) -> None:
    normalized = (value or "").strip()
    if not normalized:
        raise ValidationError({"tooth_number": "Informe o número do dente."})

    permanent = {f"{quadrant}{tooth}" for quadrant in range(1, 5) for tooth in range(1, 9)}
    deciduous = {f"{quadrant}{tooth}" for quadrant in range(5, 9) for tooth in range(1, 6)}
    if normalized not in permanent and normalized not in deciduous:
        raise ValidationError({"tooth_number": "Use a numeração dentária FDI, como 11, 26, 48 ou 75."})
